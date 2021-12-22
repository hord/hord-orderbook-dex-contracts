pragma solidity 0.8.10;

interface IHPoolManager {
    function allHPoolTokens(address hPoolToken) external view returns (bool);
}
