const {
    address
} = require('./ethereum');
const hre = require("hardhat");
let configuration = require('../deployments/deploymentConfig.json');
const { ethers, expect, toHordDenomination, BigNumber } = require('./setup')

let config;
let accounts, owner, ownerAddr, hordCongress, hordCongressAddr, hPoolManager, maintainersRegistry, hordToken, dustToken, vPoolToken, champion, championAddr,
    maintainer, maintainerAddr, matchingMarket, orderBookConfiguration, hordTreasury, bobAddr, bob, aliceAddr, alice;
let vPoolManager, offerId, amountBUSDToSell, expectAmountOfVPoolTokens, amountVPoolTokenToSell, expectAmountOfBUSD, pos;
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

    describe('MatchingMarket::Functions', async() => {

        describe('MatchingMarket::First trade', async() => {
            it('alice should approve amount of tokens which he wants to spend', async() => {
                amountVPoolTokenToSell = toHordDenomination(5);
                await vPoolToken.connect(alice).approve(matchingMarket.address, amountVPoolTokenToSell);
            });

            it('should let alice to make sell offer', async() => {
                pos = 1;
                expectAmountOfBUSD = toHordDenomination(10);

                await matchingMarket.connect(alice).offer(
                    amountVPoolTokenToSell,
                    vPoolToken.address,
                    expectAmountOfBUSD,
                    dustToken.address,
                    pos
                );
            });

            it('bob should approve amount of tokens which he wants to spend', async() => {
                amountBUSDToSell = toHordDenomination(10);
                await dustToken.connect(bob).approve(matchingMarket.address, amountBUSDToSell);
            });

            it('should let bob to make buy offer', async() => {
                pos = 0;
                expectAmountOfVPoolTokens = toHordDenomination(5);

                await matchingMarket.connect(bob).offer(
                    amountBUSDToSell,
                    dustToken.address,
                    expectAmountOfVPoolTokens,
                    vPoolToken.address,
                    pos
                );
            });
        });

        describe('MatchingMarket::Second trade', async() => {

            it('bob should approve amount of tokens which he wants to spend', async() => {
                amountBUSDToSell = toHordDenomination(10);
                await dustToken.connect(bob).approve(matchingMarket.address, amountBUSDToSell);
            });

            it('should let bob to make buy offer', async() => {
                pos = 0;
                expectAmountOfVPoolTokens = toHordDenomination(5);

                await matchingMarket.connect(bob).offer(
                    amountBUSDToSell,
                    dustToken.address,
                    expectAmountOfVPoolTokens,
                    vPoolToken.address,
                    pos
                );
            });

            it('alice should approve amount of tokens which he wants to spend', async() => {
                amountVPoolTokenToSell = toHordDenomination(5);
                await vPoolToken.connect(alice).approve(matchingMarket.address, amountVPoolTokenToSell);
            });

            it('should let alice to make sell offer', async() => {
                pos = 1;
                expectAmountOfBUSD = toHordDenomination(10);

                let resp = await dustToken.balanceOf(matchingMarket.address);
                console.log(resp)

                await matchingMarket.connect(alice).offer(
                    amountVPoolTokenToSell,
                    vPoolToken.address,
                    expectAmountOfBUSD,
                    dustToken.address,
                    pos
                );

                resp = await dustToken.balanceOf(matchingMarket.address);
                console.log(resp)
            });


        });




    });


});