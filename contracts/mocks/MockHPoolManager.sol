pragma solidity 0.8.10;

contract MockHPoolManager {

    mapping(address => bool) public isHPoolToken;

    constructor() public {

    }

    function addHPoolToken(address hPoolToken) public {
        isHPoolToken[hPoolToken] = true;
    }

    function removeHPoolToken(address hPoolToken) public {
        isHPoolToken[hPoolToken] = false;
    }

}
