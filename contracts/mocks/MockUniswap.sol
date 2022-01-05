pragma solidity 0.8.10;

contract MockUniswap {

    constructor() public {

    }

    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint256[] memory amounts) {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 5;
        amounts[1] = 2;

        return amounts;
    }

    function swapExactETHForTokens(
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external payable returns (uint256[] memory amounts) {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 5;
        amounts[1] = 2;

        return amounts;
    }

    function getAmountsOut(uint amountIn, address[] memory path)
    public
    view
    returns (uint[] memory amounts) {
        uint256[] memory amounts = new uint256[](2);
        amounts[0] = 5;
        amounts[1] = 100;

        return amounts;
    }


}
