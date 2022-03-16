pragma solidity 0.8.10;

import "./system/OrderBookUpgradable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract OrderBookConfiguration is OrderBookUpgradable, Initializable {

    // Representing HORD token address
    address private _hordToken;

    // Representing dust token address
    address private _dustToken;

    // Represents limit of dust token
    uint256 private _dustLimit;

    // Represents total fee percent that gets taken on each trade
    uint256 private _totalFeePercent;

    event HordTokenAddressChanged(string parameter, address newValue);
    event DustTokenAddressChanged(string parameter, address newValue);
    event ConfigurationChanged(string parameter, uint256 newValue);

    /**
     * @notice          Initializer function
     */
    function initialize(
        address[] memory addresses,
        uint256[] memory configValues
    )
    external
    initializer
    {
        // Set hord congress and maintainers registry
        setCongressAndMaintainers(addresses[0], addresses[1]);

        _hordToken = addresses[2];
        _dustToken = addresses[3];
        _dustLimit = configValues[0];
        _totalFeePercent = configValues[1];
    }

    function setDustLimit(uint256 dustLimit_)
    external
    onlyHordCongress
    {
        require(dustLimit_ <= 100, "dustLimit_ is above threshold");
        _dustLimit = dustLimit_;
        emit ConfigurationChanged("_dustLimit", _dustLimit);
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

    function setTotalFeePercent(uint256 totalFeePercent_)
    external
    onlyHordCongress
    {
        require(dustLimit_ <= 300000, "totalFeePercent_ is above threshold");
        _totalFeePercent = totalFeePercent_;
        emit ConfigurationChanged("_totalFeePercent", _totalFeePercent);
    }


    // _dustLimit getter function
    function dustLimit()
    external
    view
    returns (uint256)
    {
        return _dustLimit;
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

    // _protocolFee getter function
    function totalFeePercent()
    external
    view
    returns (uint256)
    {
        return _totalFeePercent;
    }

    function calculateTotalFee(uint256 amount) external view returns (uint256){
        return (amount * _totalFeePercent) / 1000000;
    }

    function calculateChampionFee(uint256 amount) external pure returns (uint256){
        return (amount * 2) / 3;
    }

    function calculateOrderbookFee(uint256 amount) external pure returns (uint256){
        return amount / 3;
    }
}