pragma solidity ^0.8.0;

contract MockVPoolManager {

    mapping(address => bool) public isVPoolToken;

    function addVPoolToken(address token) external {
        isVPoolToken[token] = true;
    }

}
