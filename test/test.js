const {
    address,
    encodeParameters
} = require('./ethereum');
const hre = require("hardhat");
let configuration = require('../deployments/deploymentConfig.json');
const { ethers, expect, toHordDenomination, BigNumber } = require('./setup')

const zeroValue = 0;
let config;
let accounts, owner, ownerAddr, hordCongress, hordCongressAddr, hPoolManager, maintainersRegistry, hordToken, dustToken, vPoolToken, champion, championAddr,
    maintainer, maintainerAddr, matchingMarket, orderBookConfiguration, hordTreasury, bobAddr, bob, aliceAddr, alice, makerOtcSupportMethods;
let vPoolManager, offerId, amountBUSDToSell, expectAmountOfVPoolTokens, amountVPoolTokenToSell, expectAmountOfBUSD, pos = 0,
    matchingMarketBUSDBalance, matchingMarketVPoolTokenBalance, amountOfFeesCollected, bestOfferId, worseOfferId, openOffers = 0;
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
    alice = accounts[4];
    aliceAddr = await alice.getAddress();
    champion = accounts[5];
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

    const MakerOtcSupportMethods = await ethers.getContractFactory('MakerOtcSupportMethods');
    makerOtcSupportMethods = await MakerOtcSupportMethods.deploy();
    await makerOtcSupportMethods.deployed();
}

describe('MatchingMarket', async() => {

    before('setup contracts and accounts', async() => {
        await setupContractAndAccounts();
    });

    describe('First should set up everything', async() => {
        it('should add new VPool token', async() => {
            await vPoolManager.addVPoolToken(vPoolToken.address);
            let resp = await vPoolManager.isVPoolToken(vPoolToken.address);

            expect(resp)
                .to.be.true;
        });

        it('should send some BUSD to Bob', async() => {
            let amountToSend = toHordDenomination(100);
            await dustToken.connect(owner).transfer(bobAddr, amountToSend);
            let resp = await dustToken.balanceOf(bobAddr);

            expect(resp)
                .to.be.equal(amountToSend);
        });

        it('should send some VPoolToken to Alice', async() => {
            let amountToSend = toHordDenomination(100);
            await vPoolToken.connect(owner).transfer(aliceAddr, amountToSend);
            let resp = await vPoolToken.balanceOf(aliceAddr);

            expect(resp)
                .to.be.equal(amountToSend);
        });
    });

    describe('MatchingMarket::Make trades', async() => {

        describe('MatchingMarket::First trade', async() => {
            it('should approve amount of tokens which alice wants to spend', async() => {
                amountVPoolTokenToSell = toHordDenomination(5);
                await vPoolToken.connect(alice).approve(matchingMarket.address, amountVPoolTokenToSell);

                let resp = await vPoolToken.allowance(aliceAddr, matchingMarket.address);
                expect(resp)
                    .to.be.equal(amountVPoolTokenToSell);
            });

            it('should let alice to make sell offer', async() => {
                expectAmountOfBUSD = toHordDenomination(10);

                await matchingMarket.connect(alice).offer(
                    amountVPoolTokenToSell,
                    vPoolToken.address,
                    expectAmountOfBUSD,
                    dustToken.address,
                    pos
                );

                matchingMarketVPoolTokenBalance = await vPoolToken.balanceOf(matchingMarket.address);

                expect(matchingMarketVPoolTokenBalance)
                    .to.be.equal(amountVPoolTokenToSell);
            });

            it('bob should approve amount of tokens which he wants to spend', async() => {
                amountBUSDToSell = toHordDenomination(10);
                await dustToken.connect(bob).approve(matchingMarket.address, amountBUSDToSell);

                let resp = await dustToken.allowance(bobAddr, matchingMarket.address);
                expect(resp)
                    .to.be.equal(amountBUSDToSell);

            });

            it('should let bob to make buy offer', async() => {
                expectAmountOfVPoolTokens = toHordDenomination(5);

                await matchingMarket.connect(bob).offer(
                    amountBUSDToSell,
                    dustToken.address,
                    expectAmountOfVPoolTokens,
                    vPoolToken.address,
                    pos
                );

                amountOfFeesCollected = await orderBookConfiguration.calculateTotalFee(amountBUSDToSell);
                matchingMarketBUSDBalance = await dustToken.balanceOf(matchingMarket.address);

                expect(matchingMarketBUSDBalance)
                    .to.be.equal(matchingMarketBUSDBalance);
            });

        });

        describe('MatchingMarket::Second trade', async() => {

            it('should approve amount of tokens which bob wants to spend', async() => {
                amountBUSDToSell = toHordDenomination(10);
                await dustToken.connect(bob).approve(matchingMarket.address, amountBUSDToSell);

                let resp = await dustToken.allowance(bobAddr, matchingMarket.address);
                expect(resp)
                    .to.be.equal(amountBUSDToSell);
            });

            it('should let bob to make buy offer', async() => {
                expectAmountOfVPoolTokens = toHordDenomination(5);

                await matchingMarket.connect(bob).offer(
                    amountBUSDToSell,
                    dustToken.address,
                    expectAmountOfVPoolTokens,
                    vPoolToken.address,
                    pos
                );

                matchingMarketBUSDBalance = await dustToken.balanceOf(matchingMarket.address);

                expect(matchingMarketBUSDBalance)
                    .to.be.equal(new BigNumber.from(amountBUSDToSell).add(amountOfFeesCollected));
            });

            it('should approve amount of tokens which she wants to spend', async() => {
                amountVPoolTokenToSell = toHordDenomination(5);
                await vPoolToken.connect(alice).approve(matchingMarket.address, amountVPoolTokenToSell);

                let resp = await vPoolToken.allowance(aliceAddr, matchingMarket.address);
                expect(resp)
                    .to.be.equal(amountVPoolTokenToSell);
            });

            it('should let alice to make sell offer', async() => {
                expectAmountOfBUSD = toHordDenomination(10);

                await matchingMarket.connect(alice).offer(
                    amountVPoolTokenToSell,
                    vPoolToken.address,
                    expectAmountOfBUSD,
                    dustToken.address,
                    pos
                );

                matchingMarketVPoolTokenBalance = await vPoolToken.balanceOf(matchingMarket.address);

                expect(matchingMarketVPoolTokenBalance)
                    .to.be.equal(zeroValue);

                matchingMarketBUSDBalance = await dustToken.balanceOf(matchingMarket.address);
                amountOfFeesCollected = new BigNumber.from(amountOfFeesCollected).mul(2);

                expect(matchingMarketBUSDBalance)
                    .to.be.equal(amountOfFeesCollected);
            });


        });

        describe('MatchingMarket::Kill()', async() => {
            it('bob should approve amount of tokens which he wants to spend', async() => {
                amountBUSDToSell = toHordDenomination(10);
                await dustToken.connect(bob).approve(matchingMarket.address, amountBUSDToSell);

                let resp = await dustToken.allowance(bobAddr, matchingMarket.address);
                expect(resp)
                    .to.be.equal(amountBUSDToSell);
            });

            it('should let bob to make buy offer', async() => {
                expectAmountOfVPoolTokens = toHordDenomination(5);

                await matchingMarket.connect(bob).offer(
                    amountBUSDToSell,
                    dustToken.address,
                    expectAmountOfVPoolTokens,
                    vPoolToken.address,
                    pos
                );
            });

            it('should check states after kill() function ', async() => {
                let bobBalanceBefore = await dustToken.balanceOf(bobAddr);
                let offerId = await matchingMarket.last_offer_id();

                let types = ['uint256'];
                let values = [offerId];

                let offerIdInBytes32 = encodeParameters(types, values);
                await matchingMarket.connect(bob).kill(offerIdInBytes32);
                let bobBalanceAfter = await dustToken.balanceOf(bobAddr);

                expect(bobBalanceBefore)
                    .to.be.equal(new BigNumber.from(bobBalanceAfter).sub(amountBUSDToSell));
            });
        });

        describe('MatchingMarket::Take()', async() => {
            it('should let bob to make another buy offer', async() => {
                amountBUSDToSell = toHordDenomination(10);
                await dustToken.connect(bob).approve(matchingMarket.address, amountBUSDToSell);
                expectAmountOfVPoolTokens = toHordDenomination(5);

                await matchingMarket.connect(bob).offer(
                    amountBUSDToSell,
                    dustToken.address,
                    expectAmountOfVPoolTokens,
                    vPoolToken.address,
                    pos
                );
            });

            it('should check states after take() function', async() => {
                let maxTakeAmount = toHordDenomination(10);
                let amountToSell = toHordDenomination(5);
                let offerId = await matchingMarket.last_offer_id();

                let types = ['uint256'];
                let values = [offerId];

                let offerIdInBytes32 = encodeParameters(types, values);
                let aliceBalanceBefore = await vPoolToken.balanceOf(aliceAddr);
                await vPoolToken.connect(alice).approve(matchingMarket.address, amountToSell);
                await matchingMarket.connect(alice).take(offerIdInBytes32, maxTakeAmount);

                let aliceBalanceAfter = await vPoolToken.balanceOf(aliceAddr);

                expect(aliceBalanceBefore)
                    .to.be.equal(new BigNumber.from(aliceBalanceAfter).add(amountToSell));
            });
        });

        describe('MathcingMarket::Make sell orders', async() => {
            it('should make more buy orders', async() => {
                amountBUSDToSell = toHordDenomination(10);
                await dustToken.connect(bob).approve(matchingMarket.address, amountBUSDToSell);
                expectAmountOfVPoolTokens = toHordDenomination(5);

                await matchingMarket.connect(bob).offer(
                    amountBUSDToSell,
                    dustToken.address,
                    expectAmountOfVPoolTokens,
                    vPoolToken.address,
                    pos
                );
                openOffers++;
                worseOfferId = await matchingMarket.last_offer_id();

                amountBUSDToSell = toHordDenomination(12);
                await dustToken.connect(bob).approve(matchingMarket.address, amountBUSDToSell);
                expectAmountOfVPoolTokens = toHordDenomination(5);

                await matchingMarket.connect(bob).offer(
                    amountBUSDToSell,
                    dustToken.address,
                    expectAmountOfVPoolTokens,
                    vPoolToken.address,
                    pos
                );

                openOffers++;
                bestOfferId = await matchingMarket.last_offer_id();
            });
        });

        describe('MathcingMarket::Getters', async() => {
            it('should check values from getMinSell() function', async() => {
                let resp = await matchingMarket.getMinSell(dustToken.address);
                let dustLimit = await orderBookConfiguration.dustLimit();

                expect(resp)
                    .to.be.equal(dustLimit);
            });

            it('should check values from getBestOffer() function', async() => {
                let resp = await matchingMarket.getBestOffer(dustToken.address, vPoolToken.address);
                expect(resp)
                    .to.be.equal(bestOfferId);
            });

            it('should check values from getWorseOffer() function', async() => {
                let resp = await matchingMarket.getWorseOffer(bestOfferId);
                expect(resp)
                    .to.be.equal(worseOfferId);
            });

            it('should check values from getBetterOffer() function', async() => {
                let resp = await matchingMarket.getBetterOffer(worseOfferId);
                expect(resp)
                    .to.be.equal(bestOfferId);
            });

            it('should check values from getFirstUnsortedOffer() function', async() => {
                let resp = await matchingMarket.getFirstUnsortedOffer();
                expect(resp)
                    .to.be.equal(zeroValue)
            });

            it('should check values from getNextUnsortedOffer() function', async() => {
                let resp = await matchingMarket.getNextUnsortedOffer(0);
                expect(resp)
                    .to.be.equal(zeroValue)
            });

            it('should check values from getOfferCount() function', async() => {
                let resp = await matchingMarket.getOfferCount(dustToken.address, vPoolToken.address);
                expect(resp)
                    .to.be.equal(openOffers)
            });

            it('should check values from getBuyAmount() function', async() => {
                let resp = await matchingMarket.getBuyAmount(dustToken.address, vPoolToken.address, expectAmountOfVPoolTokens);
                expect(resp)
                    .to.be.equal(amountBUSDToSell);
            });

            xit('s', async() => {
                let a = await makerOtcSupportMethods.getOffers(matchingMarket.address, dustToken.address, vPoolToken.address);
                console.log(a);
            });
        });

    });


});