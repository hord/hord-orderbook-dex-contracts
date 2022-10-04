const hre = require('hardhat');
const { networks } = require('../hardhat.config');
const rpc = networks[hre.network.name]['url'];
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(rpc));
const globalSettings = require('../deployments/deploymentConfig.json');
const { getSavedContractAddresses, getSavedContractProxies, getSavedContractProxyAbis } = require('../scripts/utils');
const { compareBytecodes } = require('./compareBytecode');

// Style
const bS = "\x1b[1m"; // Brightness start
const e = "\x1b[0m";  // End style
const u = "\x1b[4m";  // Underline
const positive = bS + "\x1b[32mTRUE ✅" + e;
const negative = bS + "\x1b[31mFALSE ❌" + e;
// Global vars
let valid = 0;
let invalid = 0;
const storageLength = 5;
// Functions
const addr = (_addr) => {
    return bS + _addr + e;
}
const eval = (condition) => {
    let msg;
    if(condition) {
        valid++;
        msg = positive;
    } else {
        invalid++;
        msg = negative;
    }
    return msg;
}
function hexToString(hex) {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
        let v = parseInt(hex.substr(i, 2), 16);
        if (v) str += String.fromCharCode(v);
    }
    return str;
}
function getNetworkEnv() {
    let env;
    if(hre.network.name.includes('mainnet') || hre.network.name.includes('Mainnet')) env = 'prod';
    else if(hre.network.name.includes('Staging')) env = 'staging';
    else env = 'test';
    return env;
}
const main = async () => {
    const contracts = getSavedContractAddresses()[hre.network.name];
    const proxies = getSavedContractProxies()[hre.network.name];
    const proxyAdminAbi = getSavedContractProxyAbis()['ProxyAdmin'];
    const proxyAdmin = await hre.ethers.getContractAt(proxyAdminAbi, proxies['ProxyAdmin']);

    const localHordCongressAddress = contracts["HordCongress"];
    const localMakerOtcSupportMethodsAddress = contracts["MakerOtcSupportMethods"];

    const splitter = "\n" + "-".repeat(process.stdout.columns) + "\n";

    console.log(splitter);
    console.log(bS + "OrderBook Structure Check" + e);

    console.log(splitter);
    const proxyAdminOwner = await proxyAdmin.owner();
    console.log("Contract:", bS + "ProxyAdmin" + e);
    console.log(u + "Owner of ProxyAdmin == HordCongress:" + e, eval(proxyAdminOwner === localHordCongressAddress));

    console.log(splitter);
    console.log("Contract:", bS + "MakerOtcSupportMethods" + e + "\n");
    const localMakerOtcSupportMethodsInstance = await hre.ethers.getContractAt("MakerOtcSupportMethods", localMakerOtcSupportMethodsAddress);
    const remoteMakerOtcSupportMethodsAddress = await localMakerOtcSupportMethodsInstance.address;
    console.log(u + 'HPool:' + e);
    console.log(
        "Local:", addr(localMakerOtcSupportMethodsAddress), "\n" +
        "Remote:", addr(remoteMakerOtcSupportMethodsAddress), "\n" +
        "Synced:", eval(localMakerOtcSupportMethodsAddress === remoteMakerOtcSupportMethodsAddress), "\n" +
        "Is bytecode matching:", eval(await compareBytecodes("MakerOtcSupportMethods", false))
    );

    for(const proxy in proxies) {
        if(proxy === 'OrderBookConfiguration' || proxy === 'MatchingMarket') {
            console.log(
                "\n" + "-".repeat(process.stdout.columns) + "\n".repeat(2) +
                "Proxy:", bS + proxy + e
            );
            const remoteAdmin = await proxyAdmin.getProxyAdmin(proxies[proxy]);

            console.log(u + "Admin Of Proxy === ProxyAdmin:" + e, eval(proxies['ProxyAdmin'] === remoteAdmin), "\n");
            const localImplementation = contracts[proxy];
            const remoteImplementation = await proxyAdmin.getProxyImplementation(proxies[proxy]);
            console.log(
                u + "Proxy Implementation:" + e,  "\n" +
                "Local:", addr(localImplementation), "\n" +
                "Remote:", addr(remoteImplementation), "\n" +
                "Synced:", eval(localImplementation === remoteImplementation) + "\n" +
                "Is bytecode matching:", eval(await compareBytecodes(proxy, false))
            );

            const proxyInstance = await hre.ethers.getContractAt(proxy, proxies[proxy]);

            console.log(u + '\nPrint Storage:' + e);
            for(let i = 0; i < storageLength; i++) {
                console.log('Slot:', i, '-', await web3.eth.getStorageAt(proxyInstance.address, i));
            }
        }
    }
    const stringHelper = "Successful: 000  Failed: 000";
    console.log(
        "\n" + "-".repeat(process.stdout.columns) +
        "\n".repeat(2) + bS + "\x1b[32mSuccessful:", valid,
        bS + "\t\x1b[31mFailed:", invalid + e + "\n"
    );
}

// Script run
main()
    .then(() => process.exit(0))
    .catch((e) => {
        console.log(e);
        process.exit(1);
    })


