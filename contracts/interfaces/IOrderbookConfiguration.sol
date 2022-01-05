pragma solidity 0.8.10;

interface IOrderbookConfiguration {
    function hordToken() external view returns(address);
    function dustToken() external view returns(address);
    function dustLimit() external view returns (uint256);
    function calculateTotalFee(uint256 amount) external view returns (uint256);
    function calculateChampionFee(uint256 amount) external view returns (uint256);
    function calculateOrderbookFee(uint256 amount) external view returns (uint256);
}