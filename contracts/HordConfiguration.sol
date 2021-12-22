pragma solidity 0.8.10;

import "./system/OrderBookUpgradable.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";

contract HordConfiguration is OrderBookUpgradable, Initializable {

    // Representing HORD token address
    address private _hordToken;
   
    event HordTokenAddressChanged(string parameter, address newValue);

    /**
     * @notice          Initializer function
     */
    function initialize(
        address[] memory addresses
    ) external initializer {
        // Set hord congress and maintainers registry
        setCongressAndMaintainers(addresses[0], addresses[1]);

        _hordToken = addresses[2];
    }

    // Setter Functions
    // _minChampStake setter function
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

    // _hordToken getter function
    function hordToken()
    external
    view
    returns (address)
    {
        return _hordToken;
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
