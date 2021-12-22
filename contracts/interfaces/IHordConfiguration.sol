pragma solidity 0.8.10;

interface IHordConfiguration {
    function hordToken() external view returns(address);
    function exitFeeAmount(uint256 usdAmountWei) external view returns (uint256);
}
