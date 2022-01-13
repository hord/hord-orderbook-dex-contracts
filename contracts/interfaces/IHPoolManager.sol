pragma solidity 0.8.10;

interface IHPoolManager {
    function isHPoolToken(address hPoolToken) external view returns (bool);
}
