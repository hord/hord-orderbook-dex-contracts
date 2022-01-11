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
        uint256 championFee;
        uint256 protocolFee;
        uint256 totalDeposit;
        bool isHPoolTokenMinted;
        bool isHPoolEnded;
        bool endingPoolInProgress;
    }
    function hPool() external returns (HPoolInfo memory);
}