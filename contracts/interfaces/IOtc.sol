pragma solidity 0.8.10;

abstract contract IOtc {
    struct OfferInfo {
        uint              pay_amt;
        address           pay_gem;
        uint              buy_amt;
        address           buy_gem;
        address           owner;
        uint64            timestamp;
    }
    mapping (uint => OfferInfo) public offers;
    function getBestOffer(address, address) public virtual view returns (uint);
    function getWorseOffer(uint) public virtual view returns (uint);
}