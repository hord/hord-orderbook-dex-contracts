// SPDX-License-Identifier: AGPL-3.0-or-later

/// matching_market.sol

// Copyright (C) 2017 - 2021 Dai Foundation

//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program.  If not, see <https://www.gnu.org/licenses/>.

pragma solidity 0.8.10;

import "./SimpleMarket.sol";

contract MatchingEvents {
    event LogMinSell(address pay_gem, uint min_amount);
    event LogUnsortedOffer(uint id);
    event LogSortedOffer(uint id);
    event BuyAndBurn(uint256 amountEthSpent, uint256 amountHordBurned);
    event HordTreasurySet(address hordTreasury);
}

contract MatchingMarket is MatchingEvents, SimpleMarket {
    struct sortInfo {
        uint next; //points to id of next higher offer
        uint prev; //points to id of previous lower offer
        uint delb; //the blocknumber where this entry was marked for delete
    }

    mapping(uint => sortInfo) public _rank; //doubly linked lists of sorted offer ids
    mapping(address => mapping(address => uint)) public _best; //id of the highest offer for a token pair
    mapping(address => mapping(address => uint)) public _span; //number of offers stored for token pair in sorted orderbook
    mapping(address => uint) public _dust; //minimum sell amount for a token to avoid dust offers
    mapping(uint => uint) public _near; //next unsorted offer id
    uint public _head; //first unsorted offer id

    // dust management
    uint256 public dustLimit;


    function initialize (
        address _hordCongress,
        address _maintainersRegistry,
        address _orderbookConfiguration,
        address _hPoolManager,
        address _vPoolManager,
        address _hordTreasury
    )
    external
    initializer
    {
        require(_hPoolManager != address(0), "HPoolManager can not be 0x0 address");
        require(_vPoolManager != address(0), "VPoolManager can not be 0x0 address");
        require(_orderbookConfiguration != address(0), "OrderbookConfiguration can not be 0x0 address");

        // Set hord congress and maintainers registry
        setCongressAndMaintainers( _hordCongress, _maintainersRegistry);

        __ReentrancyGuard_init();

        orderbookConfiguration = IOrderbookConfiguration(_orderbookConfiguration);
        hPoolManager = IHPoolManager(_hPoolManager);
        vPoolManager = IVPoolManager(_vPoolManager);
        hordTreasury = IHordTreasury(_hordTreasury);

        dustToken = IERC20(orderbookConfiguration.dustToken());
        dustLimit = orderbookConfiguration.dustLimit();

        _setMinSell(IERC20(dustToken), dustLimit);
    }

    /**
        * @notice          modifier to ensure that one of the tokens is the dust token (BUSD), and one of the tokens is an HPool token
        * @param           tokenA is a token user wants trade
        * @param           tokenB is another token user wants to trade against tokenB
     */
    modifier isValidPoolTokenPair(IERC20 tokenA, IERC20 tokenB) {
        require(
            hPoolManager.isHPoolToken(address(tokenA)) && address(tokenB) == address(dustToken) ||
            hPoolManager.isHPoolToken(address(tokenB)) && address(tokenA) == address(dustToken) ||
            vPoolManager.isVPoolToken(address(tokenA)) && address(tokenB) == address(dustToken) ||
            vPoolManager.isVPoolToken(address(tokenB)) && address(tokenA) == address(dustToken),
            "The pair is not valid."
        );
        _;
    }

    // If owner, can cancel an offer
    // If dust, anyone can cancel an offer
    modifier can_cancel(uint id) {
        require(isActive(id), "Offer was deleted or taken, or never existed.");

        require(
            msg.sender == getOwner(id) || offers[id].pay_amt < _dust[address(offers[id].pay_gem)],
            "Offer can not be cancelled because user is not owner nor a dust one."
        );
        _;
    }

    // ---- Public entrypoints ---- //

    /**
        * @notice          function to take specific order. Calls buy function which executes the buy
        * @param           id id of the specific order
        * @param           maxTakeAmount maximal amount of tokens user wants to buy from specific order
    */
    function take(bytes32 id, uint128 maxTakeAmount) public whenNotPaused {
        require(buy(uint256(id), maxTakeAmount), "Revert in buy function.");
    }

    /**
        * @notice          function to kill specific order. Calls cancel function which executes the cancellation of the specific order
        * @param           id id of the specific order
    */
    function kill(bytes32 id) external whenNotPaused {
        require(cancel(uint256(id)), "Revert in cancel function.");
    }

    /**
        * @notice          function to make a new offer. Takes funds from the caller into market escrow
        * @param           pay_amt is the amount of the token maker wants to sell
        * @param           pay_gem is an ERC20 token maker wants to sell
        * @param           buy_amt is the amount of the token maker wants to buy
        * @param           buy_gem is an ERC20 token maker wants to buy
        * @param           pos position where to insert the new offer, 0 should be used if unknown
    */
    function offer(
        uint pay_amt,
        IERC20 pay_gem,
        uint buy_amt,
        IERC20 buy_gem,
        uint pos
    )
    external
    whenNotPaused
    isValidPoolTokenPair(pay_gem, buy_gem)
    returns (uint)
    {
        return offerWithRounding(pay_amt, pay_gem, buy_amt, buy_gem, pos, true);
    }

    /**
        * @notice          function to make a new offer. Takes funds from the caller into market escrow
        * @param           pay_amt is the amount of the token maker wants to sell
        * @param           pay_gem is an ERC20 token maker wants to sell
        * @param           buy_amt is the amount of the token maker wants to buy
        * @param           buy_gem is an ERC20 token maker wants to buy
        * @param           pos is the OFFER ID of the first offer that has a higher (or lower depending on whether it is bid or ask ) price than the new offer that the caller is making. 0 should be used if unknown.
        * @param           rounding boolean value indicating whether "close enough" orders should be matched
    */
    function offerWithRounding(
        uint pay_amt,
        IERC20 pay_gem,
        uint buy_amt,
        IERC20 buy_gem,
        uint pos,
        bool rounding
    )
    public
    whenNotPaused
    isValidPoolTokenPair(pay_gem, buy_gem)
    returns (uint)
    {
        require(!locked, "Reentrancy attempt");
        require(_dust[address(pay_gem)] <= pay_amt, "The amount of tokens for sale is less than the lower limit.");

        return _matcho(pay_amt, pay_gem, buy_amt, buy_gem, pos, rounding);
    }

    /**
        * @notice          function that transfers funds from caller to offer maker, and from market to caller
        * @param           id id of the specific order
        * @param           amount amount of tokens user wants to buy from specific order
    */
    function buy(uint id, uint amount)
    public
    whenNotPaused
    can_buy(id)
    returns (bool)
    {
        require(!locked, "Reentrancy attempt");
        return _buys(id, amount);
    }

    /**
        * @notice          function that cancels an offer and refunds offer to maker
        * @param           id id of the specific order
    */
    function cancel(uint id)
    public
    whenNotPaused
    can_cancel(id)
    returns (bool success)
    {
        require(!locked, "Reentrancy attempt");
        if (isOfferSorted(id)) {
            require(_unsort(id), "Revert in _unsort function.");
        } else {
            require(_hide(id), "Revert in _hide function.");
        }
        return cancel_simple_market(id);    //delete the offer.
    }

    //returns the minimum sell amount for an offer
    function getMinSell(
        IERC20 pay_gem      //token for which minimum sell amount is queried
    )
    external
    view
    returns (uint)
    {
        return _dust[address(pay_gem)];
    }

    //return the best offer for a token pair
    //      the best offer is the lowest one if it's an ask,
    //      and highest one if it's a bid offer
    function getBestOffer(IERC20 sell_gem, IERC20 buy_gem) public view returns(uint) {
        return _best[address(sell_gem)][address(buy_gem)];
    }

    //return the next worse offer in the sorted list
    //      the worse offer is the higher one if its an ask,
    //      a lower one if its a bid offer,
    //      and in both cases the newer one if they're equal.
    function getWorseOffer(uint id) public view returns(uint) {
        return _rank[id].prev;
    }

    //return the next better offer in the sorted list
    //      the better offer is in the lower priced one if its an ask,
    //      the next higher priced one if its a bid offer
    //      and in both cases the older one if they're equal.
    function getBetterOffer(uint id) external view returns(uint) {

        return _rank[id].next;
    }

    //return the amount of better offers for a token pair
    function getOfferCount(IERC20 sell_gem, IERC20 buy_gem) external view returns(uint) {
        return _span[address(sell_gem)][address(buy_gem)];
    }

    //get the first unsorted offer that was inserted by a contract
    //      Contracts can't calculate the insertion position of their offer because it is not an O(1) operation.
    //      Their offers get put in the unsorted list of offers.
    //      Keepers can calculate the insertion position offchain and pass it to the insert() function to insert
    //      the unsorted offer into the sorted list. Unsorted offers will not be matched, but can be bought with buy().
    function getFirstUnsortedOffer() external view returns(uint) {
        return _head;
    }

    //get the next unsorted offer
    //      Can be used to cycle through all the unsorted offers.
    function getNextUnsortedOffer(uint id) external view returns(uint) {
        return _near[id];
    }

    function isOfferSorted(uint id) public view returns(bool) {
        return _rank[id].next != 0
        || _rank[id].prev != 0
        || _best[address(offers[id].pay_gem)][address(offers[id].buy_gem)] == id;
    }

    /**
        * @notice          function that attempts to exchange all of the pay_gem tokens for at least the specified amount of
                           buy_gem tokens. It is possible that more tokens will be bought (depending on the current state of
                           the orderbook). Transaction will fail if the method call determines that the caller will receive
                           less amount than the amount specified as min_fill_amount.
        * @param           pay_gem is an ERC20 token user wants to sell
        * @param           pay_amt is the amount of the token user wants to sell
        * @param           buy_gem is an ERC20 token user wants to buy
        * @param           min_fill_amount The least amount that the caller is willing to receive. If slippage happens and
                           price declines the user might end up with less of the buy_gem. In order to avoid big losses the
                           caller should provide this threshold
    */
    function sellAllAmount(IERC20 pay_gem, uint pay_amt, IERC20 buy_gem, uint min_fill_amount)
    external
    whenNotPaused
    returns (uint fill_amt)
    {
        require(!locked, "Reentrancy attempt");
        uint offerId;
        while (pay_amt > 0) {                           //while there is amount to sell
            offerId = getBestOffer(buy_gem, pay_gem);   //Get the best offer for the token pair
            require(offerId != 0, "offerId can not be 0.");                      //Fails if there are not more offers

            // There is a chance that pay_amt is smaller than 1 wei of the other token
            if (pay_amt * 1 ether < wdiv(offers[offerId].buy_amt, offers[offerId].pay_amt)) {
                break;                                  //We consider that all amount is sold
            }
            if (pay_amt >= offers[offerId].buy_amt) {                       //If amount to sell is higher or equal than current offer amount to buy
                fill_amt = add(fill_amt, offers[offerId].pay_amt);          //Add amount bought to acumulator
                pay_amt = sub(pay_amt, offers[offerId].buy_amt);            //Decrease amount to sell
                take(bytes32(offerId), uint128(offers[offerId].pay_amt));   //We take the whole offer
            } else { // if lower
                uint256 baux = rmul(pay_amt * 10 ** 9, rdiv(offers[offerId].pay_amt, offers[offerId].buy_amt)) / 10 ** 9;
                fill_amt = add(fill_amt, baux);         //Add amount bought to acumulator
                take(bytes32(offerId), uint128(baux));  //We take the portion of the offer that we need
                pay_amt = 0;                            //All amount is sold
            }
        }
        require(fill_amt >= min_fill_amount, "fill_amt is less than min_fill_amount.");
    }

    /**
       * @notice          function that attempts to exchange at most specified amount of pay_gem tokens for a
                          specified amount of buy_gem tokens. It is possible that less tokens will be spent (depending
                          on the current state of the orderbook). Transaction will fail if the method call determines
                          that the caller will pay more than the amount specified as max_fill_amount.
       * @param           buy_gem is an ERC20 token user wants to buy
       * @param           buy_amt is the amount of the token user wants to buy
       * @param           pay_gem is an ERC20 token user wants to sell
       * @param           max_fill_amount The most amount that the caller is willing to pay. If slippage happens and
                          price increases the user might end up with paying more of the pay_gem. In order to avoid big
                          losses the caller should provide this threshold.
   */
    function buyAllAmount(IERC20 buy_gem, uint buy_amt, IERC20 pay_gem, uint max_fill_amount)
    external
    whenNotPaused
    returns (uint fill_amt)
    {
        require(!locked, "Reentrancy attempt");
        uint offerId;
        while (buy_amt > 0) {                           //Meanwhile there is amount to buy
            offerId = getBestOffer(buy_gem, pay_gem);   //Get the best offer for the token pair
            require(offerId != 0, "offerId can not be 0.");

            // There is a chance that buy_amt is smaller than 1 wei of the other token
            if (buy_amt * 1 ether < wdiv(offers[offerId].pay_amt, offers[offerId].buy_amt)) {
                break;                                  //We consider that all amount is sold
            }
            if (buy_amt >= offers[offerId].pay_amt) {                       //If amount to buy is higher or equal than current offer amount to sell
                fill_amt = add(fill_amt, offers[offerId].buy_amt);          //Add amount sold to acumulator
                buy_amt = sub(buy_amt, offers[offerId].pay_amt);            //Decrease amount to buy
                take(bytes32(offerId), uint128(offers[offerId].pay_amt));   //We take the whole offer
            } else {                                                        //if lower
                fill_amt = add(fill_amt, rmul(buy_amt * 10 ** 9, rdiv(offers[offerId].buy_amt, offers[offerId].pay_amt)) / 10 ** 9); //Add amount sold to acumulator
                take(bytes32(offerId), uint128(buy_amt));                   //We take the portion of the offer that we need
                buy_amt = 0;                                                //All amount is bought
            }
        }
        require(fill_amt <= max_fill_amount, "fill_amt is less than min_fill_amount.");
    }

    function getBuyAmount(IERC20 buy_gem, IERC20 pay_gem, uint pay_amt) external view returns (uint fill_amt) {
        uint256 offerId = getBestOffer(buy_gem, pay_gem);           //Get best offer for the token pair
        while (pay_amt > offers[offerId].buy_amt) {
            fill_amt = add(fill_amt, offers[offerId].pay_amt);  //Add amount to buy accumulator
            pay_amt = sub(pay_amt, offers[offerId].buy_amt);    //Decrease amount to pay
            if (pay_amt > 0) {                                  //If we still need more offers
                offerId = getWorseOffer(offerId);               //We look for the next best offer
                require(offerId != 0, "offerId can not be 0.");                          //Fails if there are not enough offers to complete
            }
        }
        fill_amt = add(fill_amt, rmul(pay_amt * 10 ** 9, rdiv(offers[offerId].pay_amt, offers[offerId].buy_amt)) / 10 ** 9); //Add proportional amount of last offer to buy accumulator
    }

    function getPayAmount(IERC20 pay_gem, IERC20 buy_gem, uint buy_amt) external view returns (uint fill_amt) {
        uint256 offerId = getBestOffer(buy_gem, pay_gem);           //Get best offer for the token pair
        while (buy_amt > offers[offerId].pay_amt) {
            fill_amt = add(fill_amt, offers[offerId].buy_amt);  //Add amount to pay accumulator
            buy_amt = sub(buy_amt, offers[offerId].pay_amt);    //Decrease amount to buy
            if (buy_amt > 0) {                                  //If we still need more offers
                offerId = getWorseOffer(offerId);               //We look for the next best offer
                require(offerId != 0, "offerId can not be 0.");                          //Fails if there are not enough offers to complete
            }
        }
        fill_amt = add(fill_amt, rmul(buy_amt * 10 ** 9, rdiv(offers[offerId].buy_amt, offers[offerId].pay_amt)) / 10 ** 9); //Add proportional amount of last offer to pay accumulator
    }

    // ---- Internal Functions ---- //

    function _setMinSell(
        IERC20 pay_gem,     //token to assign minimum sell amount to
        uint256 dust
    )
    internal
    {
        _dust[address(pay_gem)] = dust;
        emit LogMinSell(address(pay_gem), dust);
    }

    function _buys(uint id, uint amount)
    internal
    returns (bool)
    {
        if (amount == offers[id].pay_amt) {
            if (isOfferSorted(id)) {
                //offers[id] must be removed from sorted list because all of it is bought
                _unsort(id);
            }else{
                _hide(id);
            }
        }
        require(buy_simple_market(id, amount), "Revert in buy_simple_market function.");
        // If offer has become dust during buy, we cancel it
        if (isActive(id) && offers[id].pay_amt < _dust[address(offers[id].pay_gem)]) {
            cancel(id);
        }
        return true;
    }

    //find the id of the next higher offer after offers[id]
    function _find(uint id)
    internal
    view
    returns (uint)
    {
        require(id > 0, "id must be greater than 0.");

        address buy_gem = address(offers[id].buy_gem);
        address pay_gem = address(offers[id].pay_gem);
        uint top = _best[pay_gem][buy_gem];
        uint old_top = 0;

        // Find the larger-than-id order whose successor is less-than-id.
        while (top != 0 && _isPricedLtOrEq(id, top)) {
            old_top = top;
            top = _rank[top].prev;
        }
        return old_top;
    }

    //find the id of the next higher offer after offers[id]
    function _findpos(uint id, uint pos)
    internal
    view
    returns (uint)
    {
        require(id > 0, "id must be greater than 0.");

        // Look for an active order.
        while (pos != 0 && !isActive(pos)) {
            pos = _rank[pos].prev;
        }

        if (pos == 0) {
            //if we got to the end of list without a single active offer
            return _find(id);

        } else {
            // if we did find a nearby active offer
            // Walk the order book down from there...
            if(_isPricedLtOrEq(id, pos)) {
                uint old_pos;

                // Guaranteed to run at least once because of
                // the prior if statements.
                while (pos != 0 && _isPricedLtOrEq(id, pos)) {
                    old_pos = pos;
                    pos = _rank[pos].prev;
                }
                return old_pos;

                // ...or walk it up.
            } else {
                while (pos != 0 && !_isPricedLtOrEq(id, pos)) {
                    pos = _rank[pos].next;
                }
                return pos;
            }
        }
    }

    /**
        * @notice          function returns true if offers[low] priced less than or equal to offers[high]
        * @param           low lower priced offer's id
        * @param           high higher priced offer's id
    */
    function _isPricedLtOrEq(
        uint low,
        uint high
    )
    internal
    view
    returns (bool)
    {
        return offers[low].buy_amt * offers[high].pay_amt
        >= offers[high].buy_amt * offers[low].pay_amt;
    }

    //these variables are global only because of solidity local variable limit

    /**
        * @notice          function that matches offers with taker offer, and execute token transactions
        * @param           t_pay_amt is the amount of the token taker wants to sell
        * @param           t_pay_gem is an ERC20 token taker wants to sell
        * @param           t_buy_amt is the amount of the token taker wants to buy
        * @param           t_buy_gem is an ERC20 token taker wants to buy
        * @param           pos is the OFFER ID of the first offer that has a higher (or lower depending on whether it is bid or ask ) price than the new offer that the caller is making. 0 should be used if unknown.
        * @param           rounding boolean value indicating whether "close enough" orders should be matched
    */
    function _matcho(
        uint t_pay_amt,
        IERC20 t_pay_gem,
        uint t_buy_amt,
        IERC20 t_buy_gem,
        uint pos,
        bool rounding
    )
    internal
    returns (uint id)
    {
        uint best_maker_id;    //highest maker id
        uint t_buy_amt_old;    //taker buy how much saved
        uint m_buy_amt;        //maker offer wants to buy this much token
        uint m_pay_amt;        //maker offer wants to sell this much token

        // there is at least one offer stored for token pair
        while (_best[address(t_buy_gem)][address(t_pay_gem)] > 0) {
            best_maker_id = _best[address(t_buy_gem)][address(t_pay_gem)];
            m_buy_amt = offers[best_maker_id].buy_amt;
            m_pay_amt = offers[best_maker_id].pay_amt;

            // Ugly hack to work around rounding errors. Based on the idea that
            // the furthest the amounts can stray from their "true" values is 1.
            // Ergo the worst case has t_pay_amt and m_pay_amt at +1 away from
            // their "correct" values and m_buy_amt and t_buy_amt at -1.
            // Since (c - 1) * (d - 1) > (a + 1) * (b + 1) is equivalent to
            // c * d > a * b + a + b + c + d, we write...
            if (mul(m_buy_amt, t_buy_amt) > mul(t_pay_amt, m_pay_amt) +
            (rounding ? m_buy_amt + t_buy_amt + t_pay_amt + m_pay_amt : 0))
            {
                break;
            }
            // ^ The `rounding` parameter is a compromise borne of a couple days
            // of discussion.
            buy(best_maker_id, min(m_pay_amt, t_buy_amt)); // buys if its possible
            t_buy_amt_old = t_buy_amt;
            t_buy_amt = sub(t_buy_amt, min(m_pay_amt, t_buy_amt));
            t_pay_amt = mul(t_buy_amt, t_pay_amt) / t_buy_amt_old;

            if (t_pay_amt == 0 || t_buy_amt == 0) {
                break;
            }
        }

        if (t_buy_amt > 0 && t_pay_amt > 0 && t_pay_amt >= _dust[address(t_pay_gem)]) {
            //new offer should be created
            id = offer_simple_market(t_pay_amt, t_pay_gem, t_buy_amt, t_buy_gem); // makes offer if something is left
            //insert offer into the sorted list
            _sort(id, pos);
        }


    }

    /**
        * @notice          function that puts offer into the sorted list
        * @param           id maker (ask) id
        * @param           pos position to insert into
    */
    function _sort(
        uint id,
        uint pos
    )
    internal
    {
        require(isActive(id), "offer is not active.");

        IERC20 buy_gem = offers[id].buy_gem;
        IERC20 pay_gem = offers[id].pay_gem;
        uint prev_id;                                      //maker (ask) id

        pos = pos == 0 || offers[pos].pay_gem != pay_gem || offers[pos].buy_gem != buy_gem || !isOfferSorted(pos)
        ?
        _find(id)
        :
        _findpos(id, pos);

        if (pos != 0) {                                    //offers[id] is not the highest offer
            //requirement below is satisfied by statements above
            //require(_isPricedLtOrEq(id, pos));
            prev_id = _rank[pos].prev;
            _rank[pos].prev = id;
            _rank[id].next = pos;
        } else {                                           //offers[id] is the highest offer
            prev_id = _best[address(pay_gem)][address(buy_gem)];
            _best[address(pay_gem)][address(buy_gem)] = id;
        }

        if (prev_id != 0) {                               //if lower offer does exist
            //requirement below is satisfied by statements above
            //require(!_isPricedLtOrEq(id, prev_id));
            _rank[prev_id].next = id;
            _rank[id].prev = prev_id;
        }

        _span[address(pay_gem)][address(buy_gem)]++;
        emit LogSortedOffer(id);
    }

    /**
        * @notice          function that removes offer from the sorted list (does not cancel offer)
        * @param           id id of maker (ask) offer to remove from sorted list
    */
    function _unsort(
        uint id
    )
    internal
    returns (bool)
    {
        address buy_gem = address(offers[id].buy_gem);
        address pay_gem = address(offers[id].pay_gem);
        require(_span[pay_gem][buy_gem] > 0, "There is no offer for this token pair.");

        require(_rank[id].delb == 0 &&                    //assert id is in the sorted list
            isOfferSorted(id), "Id is not in the sorted list.");

        if (id != _best[pay_gem][buy_gem]) {              // offers[id] is not the highest offer
            require(_rank[_rank[id].next].prev == id, "Id is not on valid pos.");
            _rank[_rank[id].next].prev = _rank[id].prev;
        } else {                                          //offers[id] is the highest offer
            _best[pay_gem][buy_gem] = _rank[id].prev;
        }

        if (_rank[id].prev != 0) {                        //offers[id] is not the lowest offer
            require(_rank[_rank[id].prev].next == id, "Id is not on valid pos.");
            _rank[_rank[id].prev].next = _rank[id].next;
        }

        _span[pay_gem][buy_gem]--;
        _rank[id].delb = block.number;                    //mark _rank[id] for deletion
        return true;
    }

    //Hide offer from the unsorted order book (does not cancel offer)
    function _hide(
        uint id     //id of maker offer to remove from unsorted list
    )
    internal
    returns (bool)
    {
        uint uid = _head;               //id of an offer in unsorted offers list
        uint pre = uid;                 //id of previous offer in unsorted offers list

        require(!isOfferSorted(id), "OrderId is in sorted offers list.");    //make sure offer id is not in sorted offers list

        if (_head == id) {              //check if offer is first offer in unsorted offers list
            _head = _near[id];          //set head to new first unsorted offer
            _near[id] = 0;              //delete order from unsorted order list
            return true;
        }
        while (uid > 0 && uid != id) {  //find offer in unsorted order list
            pre = uid;
            uid = _near[uid];
        }
        if (uid != id) {                //did not find offer id in unsorted offers list
            return false;
        }
        _near[pre] = _near[id];         //set previous unsorted offer to point to offer after offer id
        _near[id] = 0;                  //delete order from unsorted order list
        return true;
    }
}
