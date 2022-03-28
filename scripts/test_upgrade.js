const hre = require("hardhat");
let c = require('../deployments/deploymentConfig.json');
const { getSavedContractAddresses, saveContractAddress} = require('./utils');


async function main() {

    await hre.run('compile');
    const config = c[hre.network.name];
    const contracts = getSavedContractAddresses()[hre.network.name];

    const OrderBookConfiguration = await ethers.getContractFactory('OrderBookConfiguration');
    const orderBookConfiguration = await OrderBookConfiguration.deploy();
    await orderBookConfiguration.deployed();

    console.log('New OrderBookConfiguration is deployed to: ', orderBookConfiguration.address);
    saveContractAddress(hre.network.name, 'OrderBookConfiguration', orderBookConfiguration.address);
}

main();
