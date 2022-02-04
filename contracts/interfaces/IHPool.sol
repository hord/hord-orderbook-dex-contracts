pragma solidity 0.8.10;

interface IHPool {
    struct HPoolInfo {
        address championAddress;
        address hPoolImplementation;
        address baseAsset;
        uint256 totalBaseAssetAtLaunch;
        uint256 hPoolId;
        uint256 bePoolId;
        uint256 initialPoolWorthUSD;
        uint256 availableToClaimChampionSuccessFee;
        uint256 totalChampionSuccessFee;
        uint256 availableToClaimProtocolFee;
        uint256 totalProtocolFee;
        uint256 totalDeposit;
        bool isHPoolEnded;
    }
    function hPool() external returns (HPoolInfo memory);
}