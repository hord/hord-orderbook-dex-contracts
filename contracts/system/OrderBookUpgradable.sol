pragma solidity 0.8.10;

import "../interfaces/IMaintainersRegistry.sol";

contract OrderBookUpgradable {

    address public hordCongress;
    IMaintainersRegistry public maintainersRegistry;

    modifier onlyMaintainer {
        require(maintainersRegistry.isMaintainer(msg.sender), "Restricted only to maintainer.");
        _;
    }

    modifier onlyHordCongress {
        require(msg.sender == hordCongress, "Restricted only to HordCongress.");
        _;
    }

    function setCongressAndMaintainers(
        address _hordCongress,
        address _maintainersRegistry
    )
    internal
    {
        require(_hordCongress != address(0), "Hord congress can't be 0x0 address");
        require(_maintainersRegistry != address(0), "Maintainers regsitry can't be 0x0 address");
        hordCongress = _hordCongress;
        maintainersRegistry = IMaintainersRegistry(_maintainersRegistry);
    }

}
