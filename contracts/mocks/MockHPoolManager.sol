pragma solidity 0.8.10;

contract MockHPoolManager {

    mapping(address => bool) public allHPoolTokens;

    constructor() public {

    }

    function addHPoolToken(address hPoolToken) public {
        allHPoolTokens[hPoolToken] = true;
    }

    function removeHPoolToken(address hPoolToken) public {
        allHPoolTokens[hPoolToken] = false;
    }

}
