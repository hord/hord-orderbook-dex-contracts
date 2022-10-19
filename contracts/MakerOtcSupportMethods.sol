// Normally, querying offers directly OasisDEX order book would require making several
// calls to the contract to extract all the active orders. An alternative would be to cache this
// information on the server side, but we can also use a support contract to save on the number of queries.
// The MakerOtcSupportsMethods contract provides an easy way to list all the pending orders in a
// single call, considerably speeding the request.
pragma solidity 0.8.10;

import "./libraries/DSMath.sol";
import "./interfaces/IOtc.sol";
import "./system/OrderBookUpgradable.sol";

contract MakerOtcSupportMethods is DSMath, OrderBookUpgradable {

    /**
         * @notice          Function to return all the current orders using several arrays
         * @param           otc is MatchingMarket
         * @param           payToken is the token user wants to sell
         * @param           buyToken is the token user wants to buy
     */
    function getOffers(IOtc otc, address payToken, address buyToken) public view
    returns (uint[100] memory ids, uint[100] memory payAmts, uint[100] memory buyAmts, address[100] memory owners, uint[100] memory timestamps)
    {
        (ids, payAmts, buyAmts, owners, timestamps) = getOffersWithId(otc, otc.getBestOffer(payToken, buyToken));
    }

    function getOffersWithId(IOtc otc, uint offerId) public view
    returns (uint[100] memory ids, uint[100] memory payAmts, uint[100] memory buyAmts, address[100] memory owners, uint[100] memory timestamps)
    {
        uint i = 0;
        do {
            (payAmts[i],, buyAmts[i],, owners[i], timestamps[i]) = otc.offers(offerId);
            if(owners[i] == address(0)) break;
            ids[i] = offerId;
            offerId = otc.getWorseOffer(offerId);
        } while (++i < 100);
    }

    function getOffersAmountToSellAll(IOtc otc, address payToken, uint payAmt, address buyToken) public view returns (uint ordersToTake, bool takesPartialOrder) {
        uint offerId = otc.getBestOffer(buyToken, payToken);                        // Get best offer for the token pair
        ordersToTake = 0;
        uint payAmt2 = payAmt;
        uint orderBuyAmt = 0;
        (,,orderBuyAmt,,,) = otc.offers(offerId);
        while (payAmt2 > orderBuyAmt) {
            ordersToTake ++;                                                        // New order taken
            payAmt2 = sub(payAmt2, orderBuyAmt);                                    // Decrease amount to pay
            if (payAmt2 > 0) {                                                      // If we still need more offers
                offerId = otc.getWorseOffer(offerId);                               // We look for the next best offer
                require(offerId != 0);                                              // Fails if there are not enough offers to complete
                (,,orderBuyAmt,,,) = otc.offers(offerId);
            }

        }
        ordersToTake = payAmt2 == orderBuyAmt ? ordersToTake + 1 : ordersToTake;    // If the remaining amount is equal than the latest order, then it will also be taken completely
        takesPartialOrder = payAmt2 < orderBuyAmt;                                  // If the remaining amount is lower than the latest order, then it will take a partial order
    }

    function getOffersAmountToBuyAll(IOtc otc, address buyToken, uint buyAmt, address payToken) public view returns (uint ordersToTake, bool takesPartialOrder) {
        uint offerId = otc.getBestOffer(buyToken, payToken);                        // Get best offer for the token pair
        ordersToTake = 0;
        uint buyAmt2 = buyAmt;
        uint orderPayAmt = 0;
        (orderPayAmt,,,,,) = otc.offers(offerId);
        while (buyAmt2 > orderPayAmt) {
            ordersToTake ++;                                                        // New order taken
            buyAmt2 = sub(buyAmt2, orderPayAmt);                                    // Decrease amount to buy
            if (buyAmt2 > 0) {                                                      // If we still need more offers
                offerId = otc.getWorseOffer(offerId);                               // We look for the next best offer
                require(offerId != 0);                                              // Fails if there are not enough offers to complete
                (orderPayAmt,,,,,) = otc.offers(offerId);
            }
        }
        ordersToTake = buyAmt2 == orderPayAmt ? ordersToTake + 1 : ordersToTake;    // If the remaining amount is equal than the latest order, then it will also be taken completely
        takesPartialOrder = buyAmt2 < orderPayAmt;                                  // If the remaining amount is lower than the latest order, then it will take a partial order
    }
}