pragma solidity 0.8.10;

interface IMaintainersRegistry {
    function isMaintainer(address _address) external view returns (bool);
}
