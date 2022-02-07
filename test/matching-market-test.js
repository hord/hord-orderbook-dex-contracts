const {
    address,
    encodeParameters
} = require('./ethereum');
const hre = require("hardhat");
let configuration = require('../deployments/deploymentConfig.json');
const { ethers, expect, toHordDenomination, BigNumber } = require('./setup')

let config;
let accounts, owner, ownerAddr, hordCongress, hordCongressAddr, hPoolManager, maintainersRegistry, hordToken, dustToken, champion, championAddr,
    maintainer, maintainerAddr, matchingMarket, uniswapRouter, orderBookConfiguration, hordTreasury, firstHPoolToken, secondHPoolToken, user, userAddr;
let offerId, amount, amountBuy = 0, amountSell = 0, minSellAmount = 1, bestOffer = 2, worseOffer = 3, offerCnt = 0, zerro = 0;

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
    champion = accounts[4];
    championAddr = await champion.getAddress();

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
        ownerAddr,
        championAddr
    );
    await hordToken.deployed();

    ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    dustToken = await ERC20Mock.deploy(
        "DustToken",
        "DT",
        toHordDenomination(100000000),
        ownerAddr,
        championAddr
    );
    await dustToken.deployed();

    ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    firstHPoolToken = await ERC20Mock.deploy(
        "DustToken",
        "DT",
        toHordDenomination(100000000),
        ownerAddr,
        championAddr
    );
    await firstHPoolToken.deployed();

    ERC20Mock = await hre.ethers.getContractFactory("ERC20Mock");
    secondHPoolToken = await ERC20Mock.deploy(
        "DustToken",
        "DT",
        toHordDenomination(100000000),
        ownerAddr,
        championAddr
    );
    await secondHPoolToken.deployed();

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
            minSellAmount,
            25
        ]
    );

    const MockHPoolManager = await ethers.getContractFactory('MockHPoolManager');
    hPoolManager = await MockHPoolManager.deploy();
    await hPoolManager.deployed();

    const MockHordTreasury = await ethers.getContractFactory('MockHordTreasury');
    hordTreasury = await MockHordTreasury.deploy();
    await hordTreasury.deployed();

    const MatchingMarket = await ethers.getContractFactory('MatchingMarket');
    matchingMarket = await MatchingMarket.deploy();
    await matchingMarket.deployed();
}

describe('MatchingMarket', async() => {

    before('setup contracts and accounts', async() => {
        await setupContractAndAccounts();
    });

    describe('MatchingMarket::Initialization', async() => {
        it('should not let initialize MatchingMarket contract with 0x0 address for orderBookConfiguration', async() => {
            await expect(
                matchingMarket.initialize(
                    hordCongressAddr,
                    maintainersRegistry.address,
                    address(0),
                    uniswapRouter.address,
                    hPoolManager.address,
                    hordTreasury.address
                )
            ).to.be.revertedWith("OrderbookConfiguration can not be 0x0 address");
        });

        it('should not let initialize MatchingMarket contract with 0x0 address for hPoolManager', async() => {
            await expect(
                matchingMarket.initialize(
                    hordCongressAddr,
                    maintainersRegistry.address,
                    orderBookConfiguration.address,
                    uniswapRouter.address,
                    address(0),
                    hordTreasury.address
                )
            ).to.be.revertedWith("HPoolManager can not be 0x0 address");
        });

        it('should not let initialize MatchingMarket contract with 0x0 address for HordCongress', async() => {
            await expect(
                matchingMarket.initialize(
                    address(0),
                    maintainersRegistry.address,
                    orderBookConfiguration.address,
                    uniswapRouter.address,
                    hPoolManager.address,
                    hordTreasury.address
                )
            ).to.be.revertedWith("Hord congress can't be 0x0 address");
        });

        it('should not let initialize MatchingMarket contract with 0x0 address for MaintainersRegsitry', async() => {
            await expect(
                matchingMarket.initialize(
                    hordCongressAddr,
                    address(0),
                    orderBookConfiguration.address,
                    uniswapRouter.address,
                    hPoolManager.address,
                    hordTreasury.address
                )
            ).to.be.revertedWith("Maintainers regsitry can't be 0x0 address");
        });

        it('should let initialize MatchingMarket contract with right arguments', async() => {
            await matchingMarket.initialize(
                hordCongressAddr,
                maintainersRegistry.address,
                orderBookConfiguration.address,
                uniswapRouter.address,
                hPoolManager.address,
                hordTreasury.address
            );
        });


    });

    describe('should send HPoolToken`s and BUSD to user and matchingMarket contract', async() => {
        it('should send BUSD and HPoolToken`s to the user', async() => {
            amount = 100000;

            await firstHPoolToken.connect(owner).transfer(userAddr, amount);
            await secondHPoolToken.connect(owner).transfer(userAddr, amount);
            await dustToken.connect(owner).transfer(userAddr, amount);

            let amountFirstAfter = await firstHPoolToken.balanceOf(userAddr);
            let amountSecondAfter = await secondHPoolToken.balanceOf(userAddr);
            let amountBUSDAfter = await dustToken.balanceOf(userAddr);

            expect(amount)
                .to.be.equal(amountFirstAfter)
            expect(amount)
                .to.be.equal(amountSecondAfter)
            expect(amount)
                .to.be.equal(amountBUSDAfter)
        });

        it('should send BUSD and HPoolToken`s to the matchingMarket contract', async() => {
            amount = 10000000;

            await firstHPoolToken.connect(owner).transfer(matchingMarket.address, amount);
            await secondHPoolToken.connect(owner).transfer(matchingMarket.address, amount);
            await dustToken.connect(owner).transfer(matchingMarket.address, amount);

            let amountFirstAfter = await firstHPoolToken.balanceOf(matchingMarket.address);
            let amountSecondAfter = await secondHPoolToken.balanceOf(matchingMarket.address);
            let amountBUSDAfter = await dustToken.balanceOf(matchingMarket.address);

            expect(amount)
                .to.be.equal(amountFirstAfter)
            expect(amount)
                .to.be.equal(amountSecondAfter)
            expect(amount)
                .to.be.equal(amountBUSDAfter)
        });

    });

    describe('MatchingMarket::Make offer', async() => {

        it('should not let to make offer for invalid pair', async() => {
            await expect(
                matchingMarket.offer(
                    amountSell,
                    dustToken.address,
                    amountBuy,
                    firstHPoolToken.address,
                    0
                )
            ).to.be.revertedWith('The pair is not valid.');
        });

        it('should first add token to array of allHPoolTokens', async() => {
            await hPoolManager.addHPoolToken(firstHPoolToken.address);
            await hPoolManager.addHPoolToken(secondHPoolToken.address);
            let resp = await hPoolManager.isHPoolToken(firstHPoolToken.address);

            expect(resp)
                .to.be.true;
        });

        it('should not let to make offer if amount of sell tokens is less than minimum', async() => {
            await expect(matchingMarket.connect(owner).offer(amountSell, dustToken.address, amountBuy, firstHPoolToken.address, 0))
                .to.be.revertedWith("The amount of tokens for sale is less than the lower limit.");
        });

        it('should make a first offer', async() => {
            await dustToken.connect(owner).approve(matchingMarket.address, 1000);
            await firstHPoolToken.connect(user).approve(matchingMarket.address, 1000);

            amountSell = 100;
            amountBuy = 5;
            await matchingMarket.connect(owner).offer(amountSell, dustToken.address, amountBuy, firstHPoolToken.address, 0);
            offerCnt++;

            amountSell = 120;
            await matchingMarket.connect(owner).offer(amountSell, dustToken.address, amountBuy, firstHPoolToken.address, 0);
            offerCnt++;

            amountSell = 30;
            await matchingMarket.connect(owner).offer(amountSell, dustToken.address, amountBuy, firstHPoolToken.address, 0);
            offerCnt++;

            // amountSell = 5;
            // amountBuy = 100;
            // await matchingMarket.connect(user).offer(amountSell, firstHPoolToken.address, amountBuy, dustToken.address, 0);

            offerId = 1;

            let offer = await matchingMarket.getOffer(offerId);
            expect(offer[3])
                .to.be.equal(firstHPoolToken.address);

            offerId = 2;

            offer = await matchingMarket.getOffer(offerId);
            expect(offer[3])
                .to.be.equal(firstHPoolToken.address);

        });

        // it('s', async() => {
        //     await matchingMarket.kill("0x0000000000000000000000000000000000000000000000000000000000000001");
        // });

    });

    describe('MatchingMarketing::Get functions', async() => {

        it('should check best offer', async() => {
            let best = await matchingMarket.getBestOffer(dustToken.address, firstHPoolToken.address);
            expect(best)
                .to.be.equal(offerId);
        });

        it('should check worse offer', async() => {
            offerId = 1;
            let worse = await matchingMarket.getWorseOffer(offerId);
            expect(worse)
                .to.be.equal(worseOffer);
        });

        it('should check better offer', async() => {
            let better = await matchingMarket.getBetterOffer(offerId);
            expect(better)
                .to.be.equal(bestOffer);
        });

        it('should check return value in getMinSell function', async() => {
            let minSell = await matchingMarket.getMinSell(dustToken.address);
            expect(minSell)
                .to.be.equal(minSellAmount);
        });

        it('should check return value in getOfferCount function', async() => {
            let offerCount = await matchingMarket.getOfferCount(dustToken.address, firstHPoolToken.address);
            expect(offerCount)
                .to.be.equal(offerCnt);
        });

        it('should check return value in getFirstUnsortedOffer function', async() => {
            let firstUnsortedOffer = await matchingMarket.getFirstUnsortedOffer();
            expect(firstUnsortedOffer)
                .to.be.equal(zerro);
        });

        it('should check return value in getNextUnsortedOffer function', async() => {
            let nextUnsortedOffer = await matchingMarket.getNextUnsortedOffer(offerId);
            expect(nextUnsortedOffer)
                .to.be.equal(zerro);
        });

        it('should check return value in isOfferSorted function', async() => {
            let isOfferSorted = await matchingMarket.isOfferSorted(offerId);
            expect(isOfferSorted)
                .to.be.true;
        });

    });

    describe('MatchingMarket::CancelOrder', async() => {

        it('should let user to cancel offer', async() => {
            offerId = 1;
            let valueBefore = await matchingMarket.getOffer(offerId);
            await matchingMarket.connect(owner).cancel(offerId);
            let valueAfter = await matchingMarket.getOffer(offerId);

            expect(valueBefore[1])
                .to.be.equal(dustToken.address);

            expect(valueAfter[1])
                .to.be.equal(address(0));
        });

    });

    describe('MatchingMarket::Buy', async() => {

        it('s', async() => {
           await matchingMarket.addTradingFee(100, firstHPoolToken.address);
           await matchingMarket.connect(champion).withdrawChampionTradingAndTransferFee(firstHPoolToken.address);
           let a = await matchingMarket.hPoolToChampionFee(firstHPoolToken.address);
           console.log(a);
        });

    });


});