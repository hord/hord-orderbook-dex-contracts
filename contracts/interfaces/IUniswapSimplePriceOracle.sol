pragma solidity ^0.5.12;

interface IUniswapSimplePriceOracle {
  function getPriceFor(address, address, uint256) external view returns (uint256);
}