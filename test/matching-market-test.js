const {
    address,
    encodeParameters
} = require('./ethereum');
const hre = require("hardhat");
let configuration = require('../deployments/deploymentConfig.json');
const { ethers, expect, toHordDenomination } = require('./setup')

let config;
let accounts, owner, ownerAddr, hordCongress, hordCongressAddr, hPoolManager, maintainersRegistry, hordToken, dustToken,
    maintainer, maintainerAddr, matchingMarket, uniswapRouter, orderBookConfiguration, hPoolToken, dustLimit = 5, user, userAddr;

async function setupContractAndAccounts () {
    config = configuration[hre.network.name];

    accounts = await ethers.getSigners();
    owner = accounts[0];
    ownerAddr = await owner.getAddress();
    hordCongress = accounts[1];
    hordCongressAddr = await hordCongress.getAddress();
    maintainer = accounts[2];
    maintainerAddr = await maintainer.getAddress();
    user = accounts[3];
    userAddr = await user.getAddress();

    const MaintainersRegistry = await ethers.getContractFactory('MockMaintainersRegistry');
    maintainersRegistry = await MaintainersRegistry.deploy();
    await maintainersRegistry.deployed();
    await maintainersRegistry.initialize([maintainerAddr], hordCongressAddr);

    const MockUniswap = await ethers.getContractFactory("MockUniswap");
    uniswapRouter = await MockUniswap.deploy();
    uniswapRouter.deployed();

    let ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    hordToken = await ERC20Mock.deploy(
        "HORD",
        "HORD",
        toHordDenomination(100000000),
        ownerAddr
    );
    await hordToken.deployed();

    ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    dustToken = await ERC20Mock.deploy(
        "DustToken",
        "DT",
        toHordDenomination(100000000),
        ownerAddr
    );
    await dustToken.deployed();

    ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    hPoolToken = await ERC20Mock.deploy(
        "DustToken",
        "DT",
        toHordDenomination(100000000),
        ownerAddr
    );
    await hPoolToken.deployed();

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
            toHordDenomination(1),
            25
        ]
    );

    const MockHPoolManager = await ethers.getContractFactory('MockHPoolManager');
    hPoolManager = await MockHPoolManager.deploy();
    await hPoolManager.deployed();

    const MatchingMarket = await ethers.getContractFactory('MatchingMarket');
    matchingMarket = await MatchingMarket.deploy();
    await matchingMarket.deployed();
    await matchingMarket.initialize(
        hordCongressAddr,
        maintainersRegistry.address,
        orderBookConfiguration.address,
        uniswapRouter.address,
        hPoolManager.address
    );

}

describe('MatchingMarket', async() => {

    before('setup contracts and accounts', async() => {
        await setupContractAndAccounts();
    });

    describe('', async() => {

        it('should first add token to array of allHPoolTokens', async() => {
            await hPoolManager.addHPoolToken(hPoolToken.address);
            let resp = await hPoolManager.isHPoolToken(hPoolToken.address);

            expect(resp)
                .to.be.true;
        });

        it('should make a first offer', async() => {
            await dustToken.connect(owner).approve(matchingMarket.address, toHordDenomination(100));
            let a, b;
            await matchingMarket.connect(owner).offer(toHordDenomination(5), dustToken.address, toHordDenomination(10), hPoolToken.address, 0);
            a = await matchingMarket.getOffer(1);
            console.log(a);
            b = await matchingMarket.getOffer(2);
            console.log(b);
            await matchingMarket.connect(owner).offer(toHordDenomination(2), dustToken.address, toHordDenomination(10), hPoolToken.address, 0);
            a = await matchingMarket.getOffer(1);
            console.log(a)
            b = await matchingMarket.getOffer(2);
            console.log(b);
        });
    });

});