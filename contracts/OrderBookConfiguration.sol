pragma solidity 0.8.10;

import "./system/OrderBookUpgradable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

contract OrderBookConfiguration is OrderBookUpgradable, Initializable {

    // Representing HORD token address
    address public hordToken;
    // Representing dust token address
    address public dustToken;
    // Represents limit of dust token
    uint256 public dustLimit;
    // Represents total fee percent that gets taken on each trade
    uint256 public totalFeePercent;
    // Represents percent precision
    uint256 public percentPrecision;

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

        hordToken = addresses[2];
        dustToken = addresses[3];
        dustLimit = configValues[0];
        totalFeePercent = configValues[1];
        percentPrecision = configValues[2];
    }

    function setDustLimit(
        uint256 _dustLimit
    )
    external
    onlyHordCongress
    {
        require(_dustLimit <= 100, "dustLimit_ is above threshold");
        dustLimit = _dustLimit;
        emit ConfigurationChanged("_dustLimit", dustLimit);
    }

    function setHordTokenAddress(
        address _hordToken
    )
    external
    onlyHordCongress
    {
        require(_hordToken != address(0), "Address can not be 0x0.");
        hordToken = _hordToken;
        emit HordTokenAddressChanged("_hordToken", hordToken);
    }

    function setDustTokenAddress(
        address _dustToken
    )
    external
    onlyHordCongress
    {
        require(_dustToken != address(0), "Address can not be 0x0.");
        dustToken = _dustToken;
        emit DustTokenAddressChanged("_hordToken", dustToken);
    }

    function setTotalFeePercent(
        uint256 _totalFeePercent
    )
    external
    onlyHordCongress
    {
        require(_totalFeePercent <= 300000, "totalFeePercent_ is above threshold");
        totalFeePercent = _totalFeePercent;
        emit ConfigurationChanged("_totalFeePercent", totalFeePercent);
    }

    function setPercentPrecision(
        uint256 _percentPrecision
    )
    external
    onlyHordCongress
    {
        percentPrecision = _percentPrecision;
        emit ConfigurationChanged("_percentPrecision", percentPrecision);
    }

    function calculateTotalFee(uint256 amount) external view returns (uint256){
        return (amount * totalFeePercent) / percentPrecision;
    }

    function calculateChampionFee(uint256 amount) external pure returns (uint256){
        return (amount * 2) / 3;
    }

    function calculateOrderbookFee(uint256 amount) external pure returns (uint256){
        return amount / 3;
    }
}