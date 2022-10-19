pragma solidity 0.8.10;

interface IHPoolManager {
    function isHPoolToken(address hPoolToken) external view returns (bool);
    function getPoolInfo(
        uint256 poolId
    )
    external
    view
    returns (
        uint256,
        uint256,
        address,
        uint256,
        uint256,
        bool,
        uint256,
        address,
        uint256,
        uint256,
        uint256,
        uint256
    );
}
