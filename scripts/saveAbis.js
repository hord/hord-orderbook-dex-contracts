const hre = require("hardhat");
const { toHordDenomination } = require('../test/setup');
const { getSavedContractABI, saveContractAbi } = require('./utils');
let c = require('../deployments/deploymentConfig.json');


async function main() {
    await hre.run('compile');

    saveContractAbi(hre.network.name, 'MatchingMarket', (await hre.artifacts.readArtifact("MatchingMarket")).abi)
    saveContractAbi(hre.network.name, 'OrderBookConfiguration', (await hre.artifacts.readArtifact("OrderBookConfiguration")).abi)
    saveContractAbi(hre.network.name, 'MakerOtcSupportMethods', (await hre.artifacts.readArtifact("MakerOtcSupportMethods")).abi)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });