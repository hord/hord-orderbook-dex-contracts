const hre = require("hardhat");
const { hexify, toHordDenomination } = require('../test/setup');
const { getSavedContractAddresses, saveContractAddress, saveContractProxies, getSavedContractProxies, getSavedContractProxyAbis } = require('./utils');
let c = require('../deployments/deploymentConfig.json');

async function main() {
    await hre.run('compile');
    const config = c[hre.network.name];
    const contracts = getSavedContractAddresses()[hre.network.name];
    const contractProxies = getSavedContractProxies()[hre.network.name];
    const abi = getSavedContractProxyAbis()["ProxyAdmin"];
    let admin = await hre.ethers.getContractAt(abi, contractProxies["ProxyAdmin"]);
    console.log(admin)
    console.log(contracts["HordCongress"]);
    await admin.transferOwnership(contractProxies["HordCongress"]);
    console.log(await admin.owner());
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
