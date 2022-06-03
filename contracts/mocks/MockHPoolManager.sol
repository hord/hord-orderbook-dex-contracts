pragma solidity ^0.8.0;

contract MockHPoolManager {

    mapping(address => bool) public isHPoolToken;

    function addHPoolToken(address token) external {
        isHPoolToken[token] = true;
    }

}
