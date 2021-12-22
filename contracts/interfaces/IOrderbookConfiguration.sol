pragma solidity 0.8.10;

interface IOrderbookConfiguration {
    function hordToken() external view returns(address);
    function dustToken() external view returns(address);
    function dustLimit() external view returns (uint256);
    function exitFeeAmount(uint256 usdAmountWei) external view returns (uint256);
}