const bre = require('hardhat')
const { ethers, web3, upgrades } = bre
const BigNumber = ethers.BigNumber
const BN = require('bn.js')
const chai = require('chai')
const expect = chai.expect

if (typeof before !== 'undefined') {
    before(setupChai)
} else {
    setupChai()
}

function setupChai() {
    chai.use(require('chai-bignumber')(BigNumber))
        .use(require('chai-as-promised'))
        .use(require('bn-chai')(BN))
        .should()
}

async function isEthException(promise) {
    let msg = 'No Exception'
    try {
        let x = await promise
        // if (!!x.wait) {
        //     await x.wait()
        // }
    } catch (e) {
        msg = e.message
    }
    return (
        msg.includes('Transaction reverted') ||
        msg.includes('VM Exception while processing transaction: revert') ||
        msg.includes('invalid opcode') ||
        msg.includes('exited with an error (status 0)')
    )
}

async function awaitTx(tx) {
    return await (await tx).wait()
}

async function waitForSomeTime(provider, seconds) {
    await provider.send('evm_increaseTime', [seconds])
}

async function currentTime(provider) {
    const block = await provider.send('eth_getBlockByNumber', ['latest', false])
    return parseInt(block.timestamp, 16)
}

function hexify(names) {
    let resp = [];

    for(const name of names) {
        let hexed = web3.utils.toHex(name);
        let prefix = '0x';
        let hexValue = hexed.slice(2);

        while(hexValue.length < 64) {
            hexValue = '0' + hexValue
        }

        resp.push(prefix + hexValue);
    }

    return resp;
}

const decimals = "1000000000000000000"

function toHordDenomination (x) {
    return BigNumber.from(x).mul(decimals)
}

module.exports = {
    ethers,
    web3,
    upgrades,
    expect,
    BigNumber,
    isEthException,
    awaitTx,
    waitForSomeTime,
    currentTime,
    toHordDenomination,
    hexify
}
