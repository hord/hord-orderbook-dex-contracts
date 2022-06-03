const {
    address
} = require('./ethereum');
const hre = require("hardhat");
let configuration = require('../deployments/deploymentConfig.json');
const { ethers, expect, toHordDenomination, BigNumber } = require('./setup')

let config;
let accounts, owner, ownerAddr, hordCongress, hordCongressAddr, hPoolManager, maintainersRegistry, hordToken, dustToken, vPoolToken, champion, championAddr,
    maintainer, maintainerAddr, matchingMarket, orderBookConfiguration, hordTreasury, bobAddr, bob;
let vPoolManager, offerId;
let dustLimit = 1, totalFeePercent = 25000, percentPrecision = 1000000;

async function setupContractAndAccounts () {
    config = configuration[hre.network.name];

    accounts = await ethers.getSigners();
    owner = accounts[0];
    ownerAddr = await owner.getAddress();
    hordCongress = accounts[1];
    hordCongressAddr = await hordCongress.getAddress();
    maintainer = accounts[2];
    maintainerAddr = await maintainer.getAddress();
    bob = accounts[3];
    bobAddr = await bob.getAddress();
    champion = accounts[4];
    championAddr = await champion.getAddress();

    const MaintainersRegistry = await ethers.getContractFactory('MockMaintainersRegistry');
    maintainersRegistry = await MaintainersRegistry.deploy();
    await maintainersRegistry.deployed();
    await maintainersRegistry.initialize([maintainerAddr], hordCongressAddr);

    let ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    hordToken = await ERC20Mock.deploy(
        "HORD",
        "HORD",
        toHordDenomination(100000000),
        ownerAddr
    );
    await hordToken.deployed();

    dustToken = await ERC20Mock.deploy(
        "BUSD",
        "BUSD",
        toHordDenomination(100000000),
        ownerAddr
    );
    await dustToken.deployed();

    vPoolToken = await ERC20Mock.deploy(
        "VPool",
        "VPool",
        toHordDenomination(100000000),
        ownerAddr
    );
    await vPoolToken.deployed();

    const OrderBookConfiguration = await ethers.getContractFactory('OrderBookConfiguration');
    orderBookConfiguration = await OrderBookConfiguration.deploy();
    await orderBookConfiguration.deployed();
    await orderBookConfiguration.initialize(
        [
            hordCongressAddr,
            maintainersRegistry.address,
            hordToken.address,
            dustToken.address
        ],
        [
            toHordDenomination(dustLimit),
            toHordDenomination(totalFeePercent),
            toHordDenomination(percentPrecision)
        ]
    );

    const MockHPoolManager = await ethers.getContractFactory('MockHPoolManager');
    hPoolManager = await MockHPoolManager.deploy();
    await hPoolManager.deployed();

    const MockVPoolManager = await ethers.getContractFactory('MockVPoolManager');
    vPoolManager = await MockVPoolManager.deploy();
    await vPoolManager.deployed();

    const MockHordTreasury = await ethers.getContractFactory('MockHordTreasury');
    hordTreasury = await MockHordTreasury.deploy();
    await hordTreasury.deployed();

    const MatchingMarket = await ethers.getContractFactory('MatchingMarket');
    matchingMarket = await MatchingMarket.deploy();
    await matchingMarket.deployed();
    await matchingMarket.initialize(
        hordCongressAddr,
        maintainersRegistry.address,
        orderBookConfiguration.address,
        hPoolManager.address,
        vPoolManager.address,
        hordTreasury.address
    );
}

describe('MatchingMarket', async() => {

    before('setup contracts and accounts', async() => {
        await setupContractAndAccounts();
    });

    describe('First should set up everything', async() => {
        it('should add new VPool token', async() => {
            await vPoolManager.addVPoolToken(vPoolToken.address);
        });

        it('should send some BUSD to bob', async() => {
            await dustToken.connect(owner).transfer(bobAddr, toHordDenomination(1000));
        });
    });

    describe('MatchingMarket::Functions', async() => {
        it('bob should approve amount of tokens which he wants to spend', async() => {
            await dustToken.connect(bob).approve(matchingMarket.address, toHordDenomination(10));
        });

        it('should let bob to make first offer', async() => {
            let pos = 0;

            await matchingMarket.connect(bob).offer(
                toHordDenomination(10),
                dustToken.address,
                toHordDenomination(5),
                vPoolToken.address,
                pos
            );

        });

    });


});