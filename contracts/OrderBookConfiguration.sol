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

    function getDustLimit()
    external
    view
    returns (uint256)
    {
        return dustLimit;
    }

}
