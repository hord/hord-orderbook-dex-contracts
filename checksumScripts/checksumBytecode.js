const hre = require('hardhat');
const { getSavedContractProxies, getSavedContractAddresses } = require('../scripts/utils');
const { compareBytecodes } = require('./compareBytecode');
//const s = require('./style');

const main = async () => {

    const contractsNames = getSavedContractAddresses()[hre.network.name];

    delete contractsNames['HordCongress'];
    delete contractsNames['HordToken'];
    delete contractsNames['DustToken'];

    console.log('---------------------------------------------------------------\nVerifying implementation bytecodes of contracts');
    for(const contractName in contractsNames) {

        if( contractName !== 'ProxyAdmin')
        {
            console.log(`---------------------------------------------------------------\n${contractName}: `);
            let isMatch = await compareBytecodes(contractName, true);
            console.log(isMatch);
        }
    }

    const proxiesContractsNames = getSavedContractProxies()[hre.network.name];

    delete proxiesContractsNames['MaintainersRegistry'];
    delete proxiesContractsNames['HordTreasury'];
    delete proxiesContractsNames['ProxyAdmin'];
    delete proxiesContractsNames['HPoolManager'];
    delete proxiesContractsNames['VPoolManager'];

    console.log('\n\n---------------------------------------------------------------\nVerifying implementation bytecodes of proxies');
    for(const proxyContractName in proxiesContractsNames) {

        if( proxyContractName !== 'ProxyAdmin')
        {
            console.log(`---------------------------------------------------------------\n${proxyContractName}: `);
            let isMatch = await compareBytecodes(proxyContractName, true);
            console.log(isMatch);
        }
    }
};

// Script run
main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e);
        process.exit(1);
    });