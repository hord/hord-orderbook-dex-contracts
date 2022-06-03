const hre = require("hardhat");
const { hexify, toHordDenomination } = require('../test/setup');
const { getSavedContractAddresses, saveContractAddress, saveContractProxies, getSavedContractProxies } = require('./utils');
let c = require('../deployments/deploymentConfig.json');

const delay = ms => new Promise(res => setTimeout(res, ms));
const delayLength = 6000;

async function main() {
    await hre.run('compile');
    const config = c[hre.network.name];
    const contracts = getSavedContractAddresses()[hre.network.name];
    const contractProxies = getSavedContractProxies()[hre.network.name];

    const MakerOtcSupportMethods = await hre.ethers.getContractFactory("MakerOtcSupportMethods");
    const makerOtcSupportMethods = await MakerOtcSupportMethods.deploy();
    await makerOtcSupportMethods.deployed();
    console.log("MakerOtcSupportMethods contract deployed to:", makerOtcSupportMethods.address);
    saveContractAddress(hre.network.name, 'MakerOtcSupportMethods', makerOtcSupportMethods.address);

    await delay(delayLength);

    const OrderBookConfiguration = await ethers.getContractFactory('OrderBookConfiguration');
    const orderBookConfiguration = await upgrades.deployProxy(OrderBookConfiguration, [
        [
            contracts["HordCongress"],
            contractProxies["MaintainersRegistry"],
            contracts["HordToken"],
            contracts["DustToken"]
        ],
        [
            toHordDenomination(config["dustLimit"]),
            config["totalFeePercent"]
        ],
    ],
        { unsafeAllow: ['delegatecall'] }
    );
    await orderBookConfiguration.deployed();
    console.log('OrderBookConfiguration Proxy is deployed to: ', orderBookConfiguration.address);
    saveContractProxies(hre.network.name, 'OrderBookConfiguration', orderBookConfiguration.address);

    await delay(delayLength);

    const MatchingMarket = await ethers.getContractFactory('MatchingMarket');
    const matchingMarket = await upgrades.deployProxy(MatchingMarket, [
            contracts['HordCongress'],
            contractProxies['MaintainersRegistry'],
            orderBookConfiguration.address,
            contractProxies['HPoolManager'],
            contractProxies['VPoolManager'],
            contractProxies['HordTreasury']
    ],
        { unsafeAllow: ['delegatecall'] }
    );
    await matchingMarket.deployed();
    console.log('MatchingMarket Proxy is deployed to: ', matchingMarket.address);
    saveContractProxies(hre.network.name, 'MatchingMarket', matchingMarket.address);

    await delay(delayLength);

    let admin = await upgrades.admin.getInstance();

    let matchingMarketImplementation = await admin.getProxyImplementation(matchingMarket.address);
    console.log('MatchingMarket Implementation: ', matchingMarketImplementation);
    saveContractAddress(hre.network.name, 'MatchingMarket', matchingMarketImplementation);

    let orderBookConfigurationImplementation = await admin.getProxyImplementation(orderBookConfiguration.address);
    console.log('OrderBookConfiguration Implementation: ', orderBookConfigurationImplementation);
    saveContractAddress(hre.network.name, 'OrderBookConfiguration', orderBookConfigurationImplementation);

    saveContractProxies(hre.network.name, 'ProxyAdmin', admin.address);

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
