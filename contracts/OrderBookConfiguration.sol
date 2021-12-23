pragma solidity 0.8.10;

import "./system/OrderBookUpgradable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract OrderBookConfiguration is OrderBookUpgradable, Initializable {

    // Representing HORD token address
    address private _hordToken;

    // Representing dust token address
    address private _dustToken;

    // Represents limit of dust token
    uint256 private _dustLimit;

    // Represents protocol fee that is taking on each trade
    uint256 private _protocolFee;

    event HordTokenAddressChanged(string parameter, address newValue);
    event DustTokenAddressChanged(string parameter, address newValue);
    event ConfigurationChanged(string parameter, uint256 newValue);

    /**
     * @notice          Initializer function
     */
    function initialize(
        address[] memory addresses,
        uint256[] memory configValues
    ) external initializer {
        // Set hord congress and maintainers registry
        setCongressAndMaintainers(addresses[0], addresses[1]);

        _hordToken = addresses[2];
        _dustToken = addresses[3];
        _dustLimit = configValues[0];
        _protocolFee = configValues[1];
    }

    function setDustLimit(uint256 dustLimit_)
    external
    onlyHordCongress
    {
        _dustLimit = dustLimit_;
        emit ConfigurationChanged("_dustLimit", _dustLimit);
    }

    function setProtocolFee(uint256 protocolFee_)
    external
    onlyHordCongress
    {
        _protocolFee = protocolFee_;
        emit ConfigurationChanged("_protocolFee", _protocolFee);
    }

    function setHordTokenAddress(
        address hordToken_
    )
    external
    onlyHordCongress
    {
        require(hordToken_ != address(0), "Address can not be 0x0.");
        _hordToken = hordToken_;
        emit HordTokenAddressChanged("_hordToken", _hordToken);
    }

    function setDustTokenAddress(
        address dustToken_
    )
    external
    onlyHordCongress
    {
        require(dustToken_ != address(0), "Address can not be 0x0.");
        _dustToken = dustToken_;
        emit DustTokenAddressChanged("_hordToken", _dustToken);
    }

    // _dustLimit getter function
    function dustLimit()
    external
    view
    returns (uint256)
    {
        return _dustLimit;
    }

    // _protocolFee getter function
    function protocolFee()
    external
    view
    returns (uint256)
    {
        return _protocolFee;
    }


    // _hordToken getter function
    function hordToken()
    external
    view
    returns (address)
    {
        return _hordToken;
    }

     // _dustToken getter function
    function dustToken()
    external
    view
    returns (address)
    {
        return _dustToken;
    }
}
