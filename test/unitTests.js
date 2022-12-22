const {
    address,
    encodeParameters
} = require('./ethereum');
const hre = require("hardhat");
let configuration = require('../deployments/deploymentConfig.json');
const { ethers, expect, toHordDenomination, BigNumber } = require('./setup')

const zeroValue = 0;
let config;
let accounts, owner, ownerAddr, hordCongress, hordCongressAddr, hPoolManager, maintainersRegistry,
    hordToken, dustToken, hETHToken, maintainer, maintainerAddr, matchingMarket, orderBookConfiguration,
    hordTreasury, makerOtcSupportMethods;
let vPoolManager, user1, user1Addr, user2, user2Addr, user3, user3Addr, user4, user4Addr, user5, user5Addr;
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
    user1 = accounts[2];
    user1Addr = await user1.getAddress();
    user2 = accounts[2];
    user2Addr = await user2.getAddress();
    user3 = accounts[2];
    user3Addr = await user3.getAddress();
    user4 = accounts[2];
    user4Addr = await user4.getAddress();
    user5 = accounts[2];
    user5Addr = await user5.getAddress();


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
        "USD",
        "USD",
        toHordDenomination(100000000),
        ownerAddr
    );
    await dustToken.deployed();

    hETHToken = await ERC20Mock.deploy(
        "hETH",
        "hETH",
        toHordDenomination(100000000),
        ownerAddr
    );
    await hETHToken.deployed();

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
            toHordDenomination(config.dustLimit),
            config.totalFeePercent,
            config.percentPrecision
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

    const MakerOtcSupportMethods = await ethers.getContractFactory('MakerOtcSupportMethods');
    makerOtcSupportMethods = await MakerOtcSupportMethods.deploy();
    await makerOtcSupportMethods.deployed();
}

describe('MatchingMarket', async() => {

    before('setup contracts and accounts', async() => {
        await setupContractAndAccounts();
    });

    describe('MatchingMarket::Initial setters', async() => {
        it('should set hETH address', async() => {
            await matchingMarket.connect(hordCongress).setHordETHStakingManager(hETHToken.address);
            let hordETHStakingManager = await matchingMarket.hordETHStakingManager();
            expect(hordETHStakingManager)
                .to.be.equal(hETHToken.address);
        });

        it('should not let hordCongress to set 0x0 address as hordETHStakingManager', async() => {
            await expect(matchingMarket.connect(hordCongress).setHordETHStakingManager(address(0)))
                .to.be.revertedWith("can not be 0x0 address");
        });

        it('should send some hETH and USD to users', async() => {
            await dustToken.connect(owner).transfer(user1Addr, toHordDenomination(100000));
            await dustToken.connect(owner).transfer(user2Addr, toHordDenomination(100000));
            await dustToken.connect(owner).transfer(user3Addr, toHordDenomination(100000));
            await dustToken.connect(owner).transfer(user4Addr, toHordDenomination(100000));
            await dustToken.connect(owner).transfer(user5Addr, toHordDenomination(100000));

            await hETHToken.connect(owner).transfer(user1Addr, toHordDenomination(1000));
            await hETHToken.connect(owner).transfer(user2Addr, toHordDenomination(1000));
            await hETHToken.connect(owner).transfer(user3Addr, toHordDenomination(1000));
            await hETHToken.connect(owner).transfer(user4Addr, toHordDenomination(1000));
            await hETHToken.connect(owner).transfer(user5Addr, toHordDenomination(1000));
        });
    });

    describe('MatchingMarket::Offer', async() => {
        it('should make some sell offer', async() => {
            await hETHToken.connect(user1).approve(matchingMarket.address, toHordDenomination(10));
            await hETHToken.connect(user3).approve(matchingMarket.address, toHordDenomination(10));
            await hETHToken.connect(user5).approve(matchingMarket.address, toHordDenomination(10));

            await matchingMarket.connect(user1).offer(
                toHordDenomination(1),
                hETHToken.address,
                toHordDenomination(100),
                dustToken.address,
                0
            );

            await matchingMarket.connect(user3).offer(
                toHordDenomination(1),
                hETHToken.address,
                toHordDenomination(200),
                dustToken.address,
                0
            );

            await matchingMarket.connect(user5).offer(
                toHordDenomination(1),
                hETHToken.address,
                toHordDenomination(100),
                dustToken.address,
                0
            );

        });

        it('should make some buy offer', async() => {
            await dustToken.connect(user2).approve(matchingMarket.address, toHordDenomination(10000));

            await matchingMarket.connect(user2).offer(
                toHordDenomination(100),
                dustToken.address,
                toHordDenomination(1),
                hETHToken.address,
                0
            );

        });
    });

});