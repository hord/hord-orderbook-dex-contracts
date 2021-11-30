pragma solidity 0.8.10;

interface IUniswapSimplePriceOracle {
  function getPriceFor(address, address, uint256) external view returns (uint256);
}