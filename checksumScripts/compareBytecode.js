const hre = require('hardhat');
const { networks } = require('../hardhat.config');
const rpc = networks[hre.network.name]['url'];
const Web3 = require('web3');
const web3 = new Web3(new Web3.providers.HttpProvider(rpc));
const { getSavedContractAddresses } = require('../scripts/utils');
const artifacts = '../artifacts/contracts';

const contracts = getSavedContractAddresses()[hre.network.name];


const compareBytecodes = async (contractName, v) => {

    const remoteByteCode = await web3.eth.getCode(contracts[contractName]);

    const localByteCode = (await hre.artifacts.readArtifact(contractName)).deployedBytecode;
    const isMatched = remoteByteCode === localByteCode;
    if(v) console.log(`artifactByteCode===deployedImplementationByteCode: ${isMatched} - (byteCode.length: ${remoteByteCode.length})`);
    return isMatched;

};
module.exports = {
    compareBytecodes
};