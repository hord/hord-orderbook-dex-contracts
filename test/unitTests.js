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
let vPoolManager, user1, user1Addr, user2, user2Addr, user3, user3Addr, user4, user4Addr, user5, user5Addr, user6Addr,
    user6, user7Addr, user7;

async function setupContractAndAccounts () {
    config = configuration[hre.network.name];

    accounts = await ethers.getSigners();
    owner = accounts[0];
    ownerAddr = await owner.getAddress();
    hordCongress = accounts[1];
    hordCongressAddr = await hordCongress.getAddress();
    maintainer = accounts[2];
    maintainerAddr = await maintainer.getAddress();
    user1 = accounts[3];
    user1Addr = await user1.getAddress();
    user2 = accounts[4];
    user2Addr = await user2.getAddress();
    user3 = accounts[5];
    user3Addr = await user3.getAddress();
    user4 = accounts[6];
    user4Addr = await user4.getAddress();
    user5 = accounts[7];
    user5Addr = await user5.getAddress();
    user6 = accounts[8];
    user6Addr = await user6.getAddress();
    user7 = accounts[9];
    user7Addr = await user7.getAddress();


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

function getEthValue(weiValue) {
    return ethers.utils.formatEther(weiValue);
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
            await dustToken.connect(owner).transfer(user1Addr, toHordDenomination(10000));
            await dustToken.connect(owner).transfer(user2Addr, toHordDenomination(10000));
            await dustToken.connect(owner).transfer(user3Addr, toHordDenomination(10000));
            await dustToken.connect(owner).transfer(user4Addr, toHordDenomination(10000));
            await dustToken.connect(owner).transfer(user5Addr, toHordDenomination(10000));
            await dustToken.connect(owner).transfer(user6Addr, toHordDenomination(10000));
            await dustToken.connect(owner).transfer(user7Addr, toHordDenomination(10000));

            await hETHToken.connect(owner).transfer(user1Addr, toHordDenomination(10));
            await hETHToken.connect(owner).transfer(user2Addr, toHordDenomination(10));
            await hETHToken.connect(owner).transfer(user3Addr, toHordDenomination(10));
            await hETHToken.connect(owner).transfer(user4Addr, toHordDenomination(10));
            await hETHToken.connect(owner).transfer(user5Addr, toHordDenomination(10));
            await hETHToken.connect(owner).transfer(user6Addr, toHordDenomination(10));
            await hETHToken.connect(owner).transfer(user7Addr, toHordDenomination(10));
        });
    });

    describe('MatchingMarket:BasicCase', async() => {
        it('should make basic buy', async() => {
            console.log('--------------------------------------------------------------------------------------------');
            await dustToken.connect(user1).approve(matchingMarket.address, toHordDenomination(1000));
            await hETHToken.connect(user2).approve(matchingMarket.address, toHordDenomination(1));

            let user1HETHBalanceBefore = await hETHToken.balanceOf(user1Addr);
            let user1USDTBalanceBefore = await dustToken.balanceOf(user1Addr);
            console.log("User1 wants to buy 2HETH for 1000$");
            console.log("User1 HETH balance before: " + getEthValue(user1HETHBalanceBefore));
            console.log("User1 USDT balance before: " + getEthValue(user1USDTBalanceBefore));

            await matchingMarket.connect(user1).offer(
                toHordDenomination(1000),
                dustToken.address,
                toHordDenomination(2),
                hETHToken.address,
                0
            );

            let user2HETHBalanceBefore = await hETHToken.balanceOf(user2Addr);
            let user2USDTBalanceBefore = await dustToken.balanceOf(user2Addr);
            console.log("User2 wants to sell 1HETH for 500$");
            console.log("User2 HETH balance before: " + getEthValue(user2HETHBalanceBefore));
            console.log("User2 USDT balance before: " + getEthValue(user2USDTBalanceBefore));


            await matchingMarket.connect(user2).offer(
                toHordDenomination(1),
                hETHToken.address,
                toHordDenomination(500),
                dustToken.address,
                0
            );

            console.log("User1 bought 1HETH for 500$");
            console.log("User2 sold 1HETH for 500$");

            let user1HETHBalanceAfter = await hETHToken.balanceOf(user1Addr);
            let user1USDTBalanceAfter = await dustToken.balanceOf(user1Addr);
            console.log("User1 HETH balance after: " + getEthValue(user1HETHBalanceAfter));
            console.log("User1 USDT balance after: " + getEthValue(user1USDTBalanceAfter));

            let user2HETHBalanceAfter = await hETHToken.balanceOf(user2Addr);
            let user2USDTBalanceAfter = await dustToken.balanceOf(user2Addr);
            console.log("User2 HETH balance after: " + getEthValue(user2HETHBalanceAfter));
            console.log("User2 USDT balance after: " + getEthValue(user2USDTBalanceAfter));

            console.log('--------------------------------------------------------------------------------------------');
        });

        it('should cancel all remaining offers', async() => {
            await matchingMarket.connect(user1).cancel(1);
        });
    });

    describe('MatchingMarket::FirstCase', async() => {
        // First make 2 buy offers A: 1200$-1HETH and B: 100$-1HETH
        it('should make some buy offers', async() => {
            console.log('--------------------------------------------------------------------------------------------');
            await dustToken.connect(user3).approve(matchingMarket.address, toHordDenomination(12000));
            await dustToken.connect(user5).approve(matchingMarket.address, toHordDenomination(1000));

            let user3HETHBalanceBefore = await hETHToken.balanceOf(user3Addr);
            let user3USDTBalanceBefore = await dustToken.balanceOf(user3Addr);
            console.log("User3 wants to buy 1HETH for 1200$");
            console.log("User3 HETH balance before: " + getEthValue(user3HETHBalanceBefore));
            console.log("User3 USDT balance before: " + getEthValue(user3USDTBalanceBefore));

            await matchingMarket.connect(user3).offer(
                toHordDenomination(1200),
                dustToken.address,
                toHordDenomination(1),
                hETHToken.address,
                0
            );

            let user5HETHBalanceBefore = await hETHToken.balanceOf(user5Addr);
            let user5USDTBalanceBefore = await dustToken.balanceOf(user5Addr);
            console.log("User5 wants to buy 1HETH for 100$");
            console.log("User5 HETH balance before: " + getEthValue(user5HETHBalanceBefore));
            console.log("User5 USDT balance before: " + getEthValue(user5USDTBalanceBefore));

            await matchingMarket.connect(user5).offer(
                toHordDenomination(100),
                dustToken.address,
                toHordDenomination(1),
                hETHToken.address,
                0
            );

            let user4HETHBalanceBefore = await hETHToken.balanceOf(user4Addr);
            let user4USDTBalanceBefore = await dustToken.balanceOf(user4Addr);
            console.log("User4 wants to sell 1HETH for 100$");
            console.log("User4 HETH balance before: " + getEthValue(user4HETHBalanceBefore));
            console.log("User4 USDT balance before: " + getEthValue(user4USDTBalanceBefore));

            await hETHToken.connect(user4).approve(matchingMarket.address, toHordDenomination(1));

            // await matchingMarket.connect(user4).offer(
            //     toHordDenomination(1),
            //     hETHToken.address,
            //     toHordDenomination(100),
            //     dustToken.address,
            //     0
            // );
            await matchingMarket.connect(user4).sellAllAmount(
                hETHToken.address,
                toHordDenomination(1),
                dustToken.address,
                toHordDenomination(100)
            );

            //buy/sell - we can put only $ amount, and price - and $ amount is enforced as max
            // I want to sell, 100$, price=...
            // I want to buy, 10$, price=...


            let user3HETHBalanceAfter = await hETHToken.balanceOf(user3Addr);
            let user3USDTBalanceAfter = await dustToken.balanceOf(user3Addr);
            console.log("User3 HETH balance after: " + getEthValue(user3HETHBalanceAfter));
            console.log("User3 USDT balance after: " + getEthValue(user3USDTBalanceAfter));

            let user5HETHBalanceAfter = await hETHToken.balanceOf(user5Addr);
            let user5USDTBalanceAfter = await dustToken.balanceOf(user5Addr);
            console.log("User5 HETH balance after: " + getEthValue(user5HETHBalanceAfter));
            console.log("User5 USDT balance after: " + getEthValue(user5USDTBalanceAfter));

            let user4HETHBalanceAfter = await hETHToken.balanceOf(user4Addr);
            let user4USDTBalanceAfter = await dustToken.balanceOf(user4Addr);
            console.log("User4 HETH balance after: " + getEthValue(user4HETHBalanceAfter));
            console.log("User4 USDT balance after: " + getEthValue(user4USDTBalanceAfter));

            console.log('--------------------------------------------------------------------------------------------');
        });

        it('should cancel all remaining offers', async() => {
            await matchingMarket.connect(user5).cancel(3);
        });

    });

    describe('MatchingMarket::SecondCase', async() => {
        // Make 2 sell offers A: 1HETH-100$ and B: 1HETH-1500$
        it('should make some sell offers', async() => {
            console.log('--------------------------------------------------------------------------------------------');
            await hETHToken.connect(user4).approve(matchingMarket.address, toHordDenomination(2));
            await hETHToken.connect(user6).approve(matchingMarket.address, toHordDenomination(2));

            let user4HETHBalanceBefore = await hETHToken.balanceOf(user4Addr);
            let user4USDTBalanceBefore = await dustToken.balanceOf(user4Addr);
            console.log("User4 wants to sell 1HETH for 100$");
            console.log("User4 HETH balance before: " + getEthValue(user4HETHBalanceBefore));
            console.log("User4 USDT balance before: " + getEthValue(user4USDTBalanceBefore));

            await matchingMarket.connect(user4).offer(
                toHordDenomination(1),
                hETHToken.address,
                toHordDenomination(100),
                dustToken.address,
                0
            );

            let user6HETHBalanceBefore = await hETHToken.balanceOf(user6Addr);
            let user6USDTBalanceBefore = await dustToken.balanceOf(user6Addr);
            console.log("User6 wants to sell 1HETH for 1500$");
            console.log("User6 HETH balance before: " + getEthValue(user6HETHBalanceBefore));
            console.log("User6 USDT balance before: " + getEthValue(user6USDTBalanceBefore));

            await matchingMarket.connect(user6).offer(
                toHordDenomination(1),
                hETHToken.address,
                toHordDenomination(1500),
                dustToken.address,
                0
            );

            let user7HETHBalanceBefore = await hETHToken.balanceOf(user7Addr);
            let user7USDTBalanceBefore = await dustToken.balanceOf(user7Addr);
            console.log("User7 wants to buy 1HETH for 1500$");
            console.log("User7 HETH balance before: " + getEthValue(user7HETHBalanceBefore));
            console.log("User7 USDT balance before: " + getEthValue(user7USDTBalanceBefore));

            await dustToken.connect(user7).approve(matchingMarket.address, toHordDenomination(1500));


            await matchingMarket.connect(user7).offer(
                toHordDenomination(1500),
                dustToken.address,
                toHordDenomination(1),
                hETHToken.address,
                0
            );

            // await matchingMarket.connect(user7).sellAllAmount(
            //     dustToken.address,
            //     toHordDenomination(1500),
            //     hETHToken.address,
            //     toHordDenomination(1)
            // );

            let user4HETHBalanceAfter = await hETHToken.balanceOf(user4Addr);
            let user4USDTBalanceAfter = await dustToken.balanceOf(user4Addr);
            console.log("User4 HETH balance after: " + getEthValue(user4HETHBalanceAfter));
            console.log("User4 USDT balance after: " + getEthValue(user4USDTBalanceAfter));

            let user6HETHBalanceAfter = await hETHToken.balanceOf(user6Addr);
            let user6USDTBalanceAfter = await dustToken.balanceOf(user6Addr);
            console.log("User6 HETH balance after: " + getEthValue(user6HETHBalanceAfter));
            console.log("User6 USDT balance after: " + getEthValue(user6USDTBalanceAfter));

            let user7HETHBalanceAfter = await hETHToken.balanceOf(user7Addr);
            let user7USDTBalanceAfter = await dustToken.balanceOf(user7Addr);
            console.log("User7 HETH balance after: " + getEthValue(user7HETHBalanceAfter));
            console.log("User7 USDT balance after: " + getEthValue(user7USDTBalanceAfter));

            console.log('--------------------------------------------------------------------------------------------');
        });

        it('should cancel all remaining offers', async() => {
            await matchingMarket.connect(user6).cancel(5);
        });
    });


    xit('s', async() => {
        let a = await makerOtcSupportMethods.getOffers(matchingMarket.address, dustToken.address, hETHToken.address);
        console.log(a);
    });


    xit('s', async() => {
        let a = await makerOtcSupportMethods.getOffers(matchingMarket.address, hETHToken.address, dustToken.address);
        console.log(a);
    });

});