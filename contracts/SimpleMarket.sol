// SPDX-License-Identifier: AGPL-3.0-or-later

/// simple_market.sol

// Copyright (C) 2016 - 2021 Dai Foundation

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

import "./libraries/DSMath.sol";
import "./system/OrderBookUpgradable.sol";
import "./interfaces/IOrderbookConfiguration.sol";
import "./interfaces/IHPool.sol";
import "./interfaces/IERC20.sol";
import "./interfaces/IHPoolManager.sol";
import "./interfaces/IVPoolManager.sol";
import "./interfaces/IHordTreasury.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";


contract EventfulMarket {
    event LogItemUpdate(uint id);
    event LogTrade(uint pay_amt, address indexed pay_gem,
        uint buy_amt, address indexed buy_gem);

    event LogMake(
        bytes32  indexed  id,
        bytes32  indexed  pair,
        address  indexed  maker,
        IERC20             pay_gem,
        IERC20             buy_gem,
        uint128           pay_amt,
        uint128           buy_amt,
        uint64            timestamp
    );

    event LogBump(
        bytes32  indexed  id,
        bytes32  indexed  pair,
        address  indexed  maker,
        IERC20            pay_gem,
        IERC20            buy_gem,
        uint128           pay_amt,
        uint128           buy_amt,
        uint64            timestamp
    );

    event LogTake(
        bytes32           id,
        bytes32  indexed  pair,
        address  indexed  maker,
        IERC20            pay_gem,
        IERC20            buy_gem,
        address  indexed  taker,
        uint128           take_amt,
        uint128           give_amt,
        uint64            timestamp
    );

    event LogKill(
        bytes32  indexed  id,
        bytes32  indexed  pair,
        address  indexed  maker,
        IERC20             pay_gem,
        IERC20             buy_gem,
        uint128           pay_amt,
        uint128           buy_amt,
        uint64            timestamp
    );

    event FeesTaken(
        uint256 championFee,
        uint256 protocolFee
    );
}

contract SimpleMarket is EventfulMarket, DSMath, OrderBookUpgradable, ReentrancyGuardUpgradeable, PausableUpgradeable {

    uint public last_offer_id; // last offer id to keep track of the last index
    bool public locked; // locked variable for reentrancy attack prevention

    mapping (uint => OfferInfo) public offers; // offer id => OfferInfo mapping
    mapping (address => ChampionFee) public poolToChampionFee;
    mapping (address => PlatformFee) public poolToPlatformFee;

    IHPoolManager public hPoolManager; // Instance of HPoolManager
    IVPoolManager public vPoolManager; // Instance of VPoolManager
    IHordTreasury public hordTreasury; // Instance of HordTreasury
    IOrderbookConfiguration public orderbookConfiguration; // Instance of Orderbook configuration contract
    IERC20 public dustToken; // main token that gets trading against HPool tokens

    struct OfferInfo {
        uint     pay_amt;
        IERC20    pay_gem;
        uint     buy_amt;
        IERC20    buy_gem;
        address  owner;
        uint64   timestamp;
    }

    struct ChampionFee {
        uint256 totalTransferFeesInPoolTokens;
        uint256 availableTransferFeesInPoolTokens;
        uint256 totalTradingFeesInStableCoin;
        uint256 availableTradingFeesInStableCoin;
    }

     struct PlatformFee {
         uint256 totalTransferFeesInPoolTokens;
         uint256 availableTransferFeesInPoolTokens;
         uint256 totalTradingFeesInStableCoin;
         uint256 availableTradingFeesInStableCoin;
     }

    event ChampionWithdrawFees(
        address championAddress,
        uint256 amountInHpoolTokens,
        uint256 amountInBaseTokens
    );
    event ProtocolWithdrawFees(
        uint256 amountInPoolTokens,
        uint256 amountInBaseTokens
    );

    /**
        * @notice          modifier to check if user can take specific order
        * @param           id offer id
    */
    modifier can_buy(uint id) {
        require(isActive(id), "Offer is not active.");
        _;
    }

    /**
        * @notice          modifier to check if user can cancel specific order, checks if offer is active and caller is owner of offer
        * @param           id offer id
    */
    modifier can_cancel_simple_market(uint id) {
        require(isActive(id), "Offer is not active.");
        require(getOwner(id) == msg.sender, "Only owner can cancel offer.");
        _;
    }

    /**
        * @notice          modifier to prevent reentrancy attack
    */
    modifier synchronized {
        require(!locked, "Locked");
        locked = true;
        _;
        locked = false;
    }

    /**
        * @notice          function that returns if offer is valid active offer
        * @param           id offer id
    */
    function isActive(uint id) public view returns (bool active) {
        return offers[id].timestamp > 0;
    }

    function addTransferFee(uint256 _amount, address _hPoolToken) external {
        require(hPoolManager.isHPoolToken(msg.sender), "Msg.sender is not HPool contract.");

        uint256 championFee = orderbookConfiguration.calculateChampionFee(_amount);
        uint256 protocolFee = orderbookConfiguration.calculateOrderbookFee(_amount);

        poolToChampionFee[_hPoolToken].availableTransferFeesInPoolTokens += championFee;
        poolToChampionFee[_hPoolToken].totalTransferFeesInPoolTokens += championFee;

        poolToPlatformFee[_hPoolToken].availableTransferFeesInPoolTokens += protocolFee;
        poolToPlatformFee[_hPoolToken].totalTransferFeesInPoolTokens += protocolFee;
    }

    function withdrawChampionTradingAndTransferFee(address pool, uint256 poolId) external nonReentrant {
        require(hPoolManager.isHPoolToken(pool) || vPoolManager.isVPoolToken(pool), "PoolToken is not valid");

        address _championAddress;

        if(hPoolManager.isHPoolToken(pool)) {
            (, , _championAddress, , , , , , , , , ) = hPoolManager.getPoolInfo(poolId);
        } else {
            (, _championAddress, , , , , ,) = vPoolManager.getPoolInfo(poolId);
        }

        require(_championAddress == msg.sender, "Only champion can withdraw his poolTokens.");

        uint256 amountInPoolTokens = poolToChampionFee[pool].availableTransferFeesInPoolTokens;
        poolToChampionFee[pool].availableTransferFeesInPoolTokens = 0;

        bool status = IERC20(pool).transfer(msg.sender, amountInPoolTokens);
        require(status, "failed transfer");

        uint256 amountInBaseTokens = poolToChampionFee[pool].availableTradingFeesInStableCoin;
        poolToChampionFee[pool].availableTradingFeesInStableCoin = 0;

        status = IERC20(orderbookConfiguration.dustToken()).transfer(msg.sender, amountInBaseTokens);
        require(status, "failed transfer");

        emit ChampionWithdrawFees(msg.sender, amountInPoolTokens, amountInBaseTokens);
    }

    function withdrawProtocolFee(address pool) external nonReentrant onlyMaintainer {
        require(hPoolManager.isHPoolToken(pool) || vPoolManager.isVPoolToken(pool), "PoolToken is not valid");

        uint256 amountInPoolTokens = poolToPlatformFee[pool].availableTransferFeesInPoolTokens;
        poolToPlatformFee[pool].availableTransferFeesInPoolTokens = 0;

        IERC20(pool).approve(address(hordTreasury), amountInPoolTokens);
        hordTreasury.depositToken(pool, amountInPoolTokens);

        uint256 amountInBaseTokens = poolToPlatformFee[pool].availableTradingFeesInStableCoin;
        poolToPlatformFee[pool].availableTradingFeesInStableCoin = 0;

        IERC20(orderbookConfiguration.dustToken()).approve(address(hordTreasury), amountInBaseTokens);
        hordTreasury.depositToken(orderbookConfiguration.dustToken(), amountInBaseTokens);


        emit ProtocolWithdrawFees(amountInPoolTokens, amountInBaseTokens);
    }

    /**
        * @notice          function that returns owner address of specific order
        * @param           id offer id
    */
    function getOwner(uint id) public view returns (address owner) {
        return offers[id].owner;
    }

    /**
        * @notice          function that returns from specific order the buy token, buy token amount, sell token and sell token amount
        * @param           id offer id
    */
    function getOffer(uint id) external view returns (uint, IERC20, uint, IERC20) {
        OfferInfo memory offer = offers[id];
        return (offer.pay_amt, offer.pay_gem,
        offer.buy_amt, offer.buy_gem);
    }

    // ---- Public entrypoints ---- //

    function bump(bytes32 id_)
    external
    can_buy(uint256(id_))
    {
        uint256 id = uint256(id_);
        emit LogBump(
            id_,
            keccak256(abi.encodePacked(offers[id].pay_gem, offers[id].buy_gem)),
            offers[id].owner,
            offers[id].pay_gem,
            offers[id].buy_gem,
            uint128(offers[id].pay_amt),
            uint128(offers[id].buy_amt),
            offers[id].timestamp
        );
    }

    /**
        * @notice          function that transfers funds from caller to offer maker, and from market to caller. Accepts given `quantity` of an offer
        * @param           id offer id
        * @param           quantity amount of tokens to buy
    */
    function buy_simple_market(uint id, uint quantity)
    internal
    can_buy(id)
    synchronized
    returns (bool)
    {
        OfferInfo memory offer = offers[id];
        uint spend = mul(quantity, offer.buy_amt) / offer.pay_amt;

        require(uint128(spend) == spend, "Cast error.");
        require(uint128(quantity) == quantity, "Cast error.");

        // For backwards semantic compatibility.
        if (quantity == 0 || spend == 0 ||
        quantity > offer.pay_amt || spend > offer.buy_amt)
        {
            return false;
        }

        offers[id].pay_amt = sub(offer.pay_amt, quantity);
        offers[id].buy_amt = sub(offer.buy_amt, spend);

        if (address(offer.buy_gem) == address(dustToken)) { // offer.buy_gem is BUSD
            uint256 totalFee = orderbookConfiguration.calculateTotalFee(spend);
            uint256 championFee = orderbookConfiguration.calculateChampionFee(totalFee);
            uint256 protocolFee = orderbookConfiguration.calculateOrderbookFee(totalFee);

            uint256 updatedSpend = spend - totalFee; // take champion and protocol fee from BUSD

            poolToPlatformFee[address(offer.pay_gem)].availableTradingFeesInStableCoin += protocolFee;
            poolToPlatformFee[address(offer.pay_gem)].totalTradingFeesInStableCoin += protocolFee;

            poolToChampionFee[address(offer.pay_gem)].availableTradingFeesInStableCoin += championFee;
            poolToChampionFee[address(offer.pay_gem)].totalTradingFeesInStableCoin += championFee;

            safeTransferFrom(offer.buy_gem, msg.sender, address(this), totalFee);
            safeTransferFrom(offer.buy_gem, msg.sender, offer.owner, updatedSpend);
            safeTransfer(offer.pay_gem, msg.sender, quantity);

            emit FeesTaken(
                championFee,
                protocolFee
            );

        } else if(address(offer.pay_gem) == address(dustToken)) { // offer.pay_gem is BUSD
            uint256 totalFee = orderbookConfiguration.calculateTotalFee(quantity);
            uint256 championFee = orderbookConfiguration.calculateChampionFee(totalFee);
            uint256 protocolFee = orderbookConfiguration.calculateOrderbookFee(totalFee); // In this condition the protocol fee already is on orderbook contract, so we dont need to transfer BUSD to it

            uint256 updatedQuantity = quantity - totalFee; // take champion and protocol fee from BUSD

            poolToPlatformFee[address(offer.buy_gem)].availableTradingFeesInStableCoin += protocolFee;
            poolToPlatformFee[address(offer.buy_gem)].totalTradingFeesInStableCoin += protocolFee;

            poolToChampionFee[address(offer.buy_gem)].availableTradingFeesInStableCoin += championFee;
            poolToChampionFee[address(offer.buy_gem)].totalTradingFeesInStableCoin += championFee;

            safeTransferFrom(offer.buy_gem, msg.sender, offer.owner, spend);
            safeTransfer(offer.pay_gem, msg.sender, updatedQuantity);

            emit FeesTaken(
                championFee,
                protocolFee
            );
        }


        emit LogItemUpdate(id);
        emit LogTake(
            bytes32(id),
            keccak256(abi.encodePacked(offer.pay_gem, offer.buy_gem)),
            offer.owner,
            offer.pay_gem,
            offer.buy_gem,
            msg.sender,
            uint128(quantity),
            uint128(spend),
            uint64(block.timestamp)
        );
        emit LogTrade(quantity, address(offer.pay_gem), spend, address(offer.buy_gem));

        if (offers[id].pay_amt == 0) {
            delete offers[id];
        }

        return true;
    }

    /**
        * @notice          function that cancels an offer and refunds offer to maker
        * @param           id offer id
    */
    function cancel_simple_market(uint id)
    internal
    can_cancel_simple_market(id)
    synchronized
    returns (bool success)
    {
        // read-only offer. Modify an offer by directly accessing offers[id]
        OfferInfo memory offer = offers[id];
        delete offers[id];

        safeTransfer(offer.pay_gem, offer.owner, offer.pay_amt);

        emit LogItemUpdate(id);
        emit LogKill(
            bytes32(id),
            keccak256(abi.encodePacked(offer.pay_gem, offer.buy_gem)),
            offer.owner,
            offer.pay_gem,
            offer.buy_gem,
            uint128(offer.pay_amt),
            uint128(offer.buy_amt),
            uint64(block.timestamp)
        );

        success = true;
    }

    /**
        * @notice          function that creates a new offer. Takes funds from the caller into market escrow
        * @param           pay_amt is the amount of the token user wants to sell
        * @param           pay_gem is an ERC20 token user wants to sell
        * @param           buy_amt is the amount of the token user wants to buy
        * @param           buy_gem is an ERC20 token user wants to buy
    */
    function offer_simple_market(uint pay_amt, IERC20 pay_gem, uint buy_amt, IERC20 buy_gem)
    internal
    synchronized
    returns (uint id)
    {
        require(uint128(pay_amt) == pay_amt, "Cast error.");
        require(uint128(buy_amt) == buy_amt, "Cast error.");
        require(pay_amt > 0, "Pay amount must be greater than 0.");
        require(pay_gem != IERC20(address(0)), "Pay token can not be 0x0 address.");
        require(buy_amt > 0, "Buy ampunt must be greater than 0.");
        require(buy_gem != IERC20(address(0)), "Buy token can not be 0x0 address.");
        require(pay_gem != buy_gem, "Pay token must be different than buy token.");

        OfferInfo memory info;
        info.pay_amt = pay_amt;
        info.pay_gem = pay_gem;
        info.buy_amt = buy_amt;
        info.buy_gem = buy_gem;
        info.owner = msg.sender;
        info.timestamp = uint64(block.timestamp);
        id = _next_id();
        offers[id] = info;

        safeTransferFrom(pay_gem, msg.sender, address(this), pay_amt);

        emit LogItemUpdate(id);
        emit LogMake(
            bytes32(id),
            keccak256(abi.encodePacked(pay_gem, buy_gem)),
            msg.sender,
            pay_gem,
            buy_gem,
            uint128(pay_amt),
            uint128(buy_amt),
            uint64(block.timestamp)
        );
    }

    /**
        * @notice          function that returns the next available id
    */
    function _next_id()
    internal
    returns (uint)
    {
        last_offer_id++; return last_offer_id;
    }

    /**
        * @notice          function that calls transfer function of ERC20 token
        * @param           token is the ERC20 token that gets transfered
        * @param           to is the address of the ERC20 token gets transfered to
        * @param           value is the amount of the ERC20 token that gets transfered
    */
    function safeTransfer(IERC20 token, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transfer.selector, to, value));
    }

    /**
        * @notice          function that calls transferFrom function of ERC20 token
        * @param           token is the the ERC20 token that gets transfered
        * @param           from is the address the ERC20 token gets transfered from
        * @param           value is the amount of the ERC20 token that gets transfered
    */
    function safeTransferFrom(IERC20 token, address from, address to, uint256 value) internal {
        _callOptionalReturn(token, abi.encodeWithSelector(token.transferFrom.selector, from, to, value));
    }

    function _callOptionalReturn(IERC20 token, bytes memory data) private {
        uint256 size;
        assembly { size := extcodesize(token) }
        require(size > 0, "Not a contract");

        (bool success, bytes memory returndata) = address(token).call(data);
        require(success, "Token call failed");
        if (returndata.length > 0) { // Return data is optional
            require(abi.decode(returndata, (bool)), "SafeERC20: ERC20 operation did not succeed");
        }
    }

    /**
       * @notice  Function allowing congress to pause the smart-contract
       * @dev     Can be only called by HordCongress
    */
    function pause()
    external
    onlyHordCongress
    {
        _pause();
    }

    /**
        * @notice  Function allowing congress to unpause the smart-contract
        * @dev     Can be only called by HordCongress
     */
    function unpause()
    external
    onlyHordCongress
    {
        _unpause();
    }

}
