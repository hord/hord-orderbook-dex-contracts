// const { expect } = require("chai");
const { ethers } = require("hardhat");

let MatchingMarketContract, owner, ownerAddr;

async function setupContractAndAccounts () {
  let accounts = await ethers.getSigners()
  owner = accounts[0]
  ownerAddr = await owner.getAddress()

  const MatchingMarket = await hre.ethers.getContractFactory("MatchingMarket");
  MatchingMarketContract = await MatchingMarket.deploy(
  );
  await MatchingMarketContract.deployed()
}

describe("MatchingMarket", function () {
  before('setup MatchingMarket contract', async () => {
    await setupContractAndAccounts()
  })
  
  it("test", async function () {
    // const Greeter = await ethers.getContractFactory("Greeter");
    // const greeter = await Greeter.deploy("Hello, world!");
    // await greeter.deployed();

    // expect(await greeter.greet()).to.equal("Hello, world!");

    // const setGreetingTx = await greeter.setGreeting("Hola, mundo!");

    // // wait until the transaction is mined
    // await setGreetingTx.wait();

    // expect(await greeter.greet()).to.equal("Hola, mundo!");
  });
});
