const hre = require("hardhat");
const { hexify, toHordDenomination } = require('../test/setup');
const { getSavedContractAddresses, saveContractAddress, saveContractProxies, getSavedContractProxies } = require('./utils');

async function main() {
    await hre.run('compile');
    const config = c[hre.network.name];
    const contracts = getSavedContractAddresses()[hre.network.name];
    const contractProxies = getSavedContractProxies()[hre.network.name];

    const MatchingMarket = await ethers.getContractFactory('MatchingMarket');
    const matchingMarket = await upgrades.deployProxy(MatchingMarket, [
            toHordDenomination(config['dustLimit']),
            contracts['HordCongress'],
            contractProxies['MaintainersRegistry'],
            contracts['UniswapRouter'],
            contracts['DustToken'],
            contracts['AggregatorV3Interface'],
            contractProxies['HordConfiguration']
    ]);
    await matchingMarket.deployed();

    let admin = await upgrades.admin.getInstance();

    let matchingMarketImplementation = await admin.getProxyImplementation(matchingMarket.address);
    console.log('Maintainers Implementation: ', matchingMarketImplementation);
    saveContractAddress(hre.network.name, 'MaintainersRegistry', matchingMarketImplementation);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
