pragma solidity 0.8.10;

interface IVPoolManager {
    function isVPoolToken(address vPoolToken) external view returns (bool);
    function getPoolInfo(uint256 poolId)
    external
    view
    returns (
        uint256,
        address,
        address,
        uint256,
        uint256,
        uint256,
        uint256,
        uint256
    );
}
