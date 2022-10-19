const hre = require("hardhat");
const { getSavedContractAddresses, getSavedContractProxies, getSavedContractABI } = require('./utils')
let c = require('../deployments/deploymentConfig.json');

async function main() {
    await hre.run('compile');
    const network = hre.network.name;
    const config = c[network];
    const contracts = getSavedContractAddresses()[network];
    const proxies = getSavedContractProxies()[network];
    let abi = getSavedContractABI(network)[network]["MatchingMarket"];

    let matchingMarket = await hre.ethers.getContractAt(abi, proxies["MatchingMarket"]);

    let offer = await matchingMarket.getOffer(1);
    console.log(offer)

}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });
