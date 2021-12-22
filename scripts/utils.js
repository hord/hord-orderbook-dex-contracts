const fs = require('fs')
const path = require('path')

function getSavedContractAddresses() {
    let json
    try {
        json = fs.readFileSync(path.join(__dirname, `../deployments/contract-addresses.json`))
    } catch (err) {
        json = '{}'
    }
    return JSON.parse(json)
}

function saveContractAddress(network, contract, address) {
    const addrs = getSavedContractAddresses()
    addrs[network] = addrs[network] || {}
    addrs[network][contract] = address
    fs.writeFileSync(path.join(__dirname, `../deployments/contract-addresses.json`), JSON.stringify(addrs, null, '    '))
}

function getSavedContractProxies() {
    let json
    try {
        json = fs.readFileSync(path.join(__dirname, `../deployments/contract-proxies.json`))
    } catch (err) {
        json = '{}'
    }
    return JSON.parse(json)
}

function saveContractProxies(network, contract, address) {
    const addrs = getSavedContractProxies()
    addrs[network] = addrs[network] || {}
    addrs[network][contract] = address
    fs.writeFileSync(path.join(__dirname, `../deployments/contract-proxies.json`), JSON.stringify(addrs, null, '    '))
}

function getSavedContractABI(network) {
    let json
    try {
        json = fs.readFileSync(path.join(__dirname, `../deployments/contract-abis-${network}.json`))
    } catch (err) {
        json = '{}'
    }
    return JSON.parse(json)
}

function saveContractAbi(network, contract, abi) {
    const abis = getSavedContractABI(network)
    abis[network] = abis[network] || {}
    abis[network][contract] = abi
    fs.writeFileSync(path.join(__dirname, `../deployments/contract-abis-${network}.json`), JSON.stringify(abis, null, '    '))
}

function saveContractAbiTest(network, contract, abi) {
    const abis = {}
    abis[network] = {}
    abis[network][contract] = abi
    fs.writeFileSync(path.join(__dirname, `../deployments/contract-abis-test.json`), JSON.stringify(abis, null, '    '))
}


function getDeploymentBlockchain() {
    let json
    try {
        json = fs.readFileSync(path.join(__dirname,'../tenderly/deployNetwork.json'))
    } catch (err) {
        json = '{}'
    }
    return JSON.parse(json);
}

function saveDeploymentBlockchain(blockchain) {
    let current = getDeploymentBlockchain();
    current['network'] = blockchain;
    fs.writeFileSync(path.join(__dirname, `../tenderly/deployNetwork.json`), JSON.stringify(current, null, '    '))
}

function getSavedContractProxyAbis() {
    let json
    try {
        json = fs.readFileSync(path.join(__dirname, `../deployments/contract-proxy-abis.json`))
    } catch (err) {
        json = '{}'
    }
    return JSON.parse(json)
}

module.exports = {
    getSavedContractAddresses,
    saveContractAddress,
    getDeploymentBlockchain,
    saveDeploymentBlockchain,
    getSavedContractProxies,
    saveContractProxies,
    getSavedContractABI,
    saveContractAbi,
    saveContractAbiTest,
    getSavedContractProxyAbis
}
