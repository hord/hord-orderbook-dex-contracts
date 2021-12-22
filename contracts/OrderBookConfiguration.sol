pragma solidity 0.8.10;

import "./system/OrderBookUpgradable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract OrderBookConfiguration is OrderBookUpgradable, Initializable {

    // Represents limit of dust token
    uint256 private dustLimit;

    event ConfigurationChanged(string parameter, uint256 newValue);

    /**
     * @notice          Initializer function
     */
    function initialize(
        address _hordCongress,
        address _maintainersRegistry
    ) external initializer {
        // Set hord congress and maintainers registry
        setCongressAndMaintainers(addresses[0], addresses[1]);
    }

    function setDustLimit(uint256 _dustLimit)
    external
    onlyHordCongress
    {
        dustLimit = _dustLimit;
        emit ConfigurationChanged("dustLimit", dustLimit);
    }

    // exitFeeAmount getter function
    function exitFeeAmount(uint256 usdAmountWei)
    external
    view
    returns (uint256)
    {
        return (sqrt(usdAmountWei) * 10**9) / 5;
    }

    /**
    * @notice Function to compute square root of a number
    */
    function sqrt(
        uint256 x
    )
    internal
    pure
    returns (uint256 y)
    {
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
