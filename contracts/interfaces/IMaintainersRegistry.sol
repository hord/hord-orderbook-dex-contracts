pragma solidity 0.8.10;

contract IMaintainersRegistry {
    function isMaintainer(address _address) external view returns (bool);
}
