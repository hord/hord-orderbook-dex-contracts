pragma solidity 0.8.10;

import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "../libraries/DSMath.sol";

contract MockMaintainersRegistry is Initializable {

    // Mappings
    mapping(address => bool) _isMaintainer;


    // Arrays
    address[] public allMaintainers;

    // chainport congress authorized address to modify maintainers
    address public hordCongress;

    // Events
    event MaintainerStatusChanged(address maintainer, bool isMember);

    /**
     * @notice      Function to perform initialization
     */
    function initialize(
        address[] memory _maintainers,
        address _hordCongress
    )
    public
    initializer
    {
        // Register congress
        hordCongress = _hordCongress;

        for(uint i = 0; i < _maintainers.length; i++) {
            addMaintainerInternal(_maintainers[i]);
        }
    }

    function addMaintainer(
        address _address
    )
    public
    {
        require(msg.sender == hordCongress, "MaintainersRegistry :: Only congress can add maintainer");
        addMaintainerInternal(_address);
    }

    /**
     * @notice      Function that serves for adding maintainer
     * @param       _address is the address that we want to give maintainer privileges to
     */
    function addMaintainerInternal(
        address _address
    )
    internal
    {
        require(_isMaintainer[_address] == false);

        // Adds new maintainer to an array
        allMaintainers.push(_address);
        // Sets that address is now maintainer
        _isMaintainer[_address] = true;

        // Emits event for change of address status to maintainer
        emit MaintainerStatusChanged(_address, true);
    }

    /**
     * @notice      Function that serves for removing maintainer
     * @param       _maintainer is target address of the maintainer we want to remove
     */
    function removeMaintainer(
        address _maintainer
    )
    external
    {
        require(msg.sender == hordCongress, "MaintainersRegistry :: Only congress can remove maintainer");
        require(_isMaintainer[_maintainer] == true);

        uint length = allMaintainers.length;

        uint i = 0;

        // While loop for finding position of targeted address
        while(allMaintainers[i] != _maintainer){
            if(i == length){
                revert();
            }
            i++;
        }

        // Removes address from maintainers array
        allMaintainers[i] = allMaintainers[length - 1];

        // Removes last element from an array
        allMaintainers.pop();

        // Sets that address is no longer maintainer
        _isMaintainer[_maintainer] = false;

        // Emits event for change of address status to non-maintainer
        emit MaintainerStatusChanged(_maintainer, false);
    }


    /**
     * @notice      Function to check if wallet is maintainer
     * @param       _address is the wallet to check
     */
    function isMaintainer(address _address)
    external
    view
    returns (bool)
    {
        return _isMaintainer[_address];
    }
}