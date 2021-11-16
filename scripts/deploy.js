// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
const { ethers } = require("hardhat");
const fs = require("fs");

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log(`Deploying contracts with the account: ${deployer.address}`);

  const balance = await deployer.getBalance();
  console.log(`Account balance: ${balance.toString()}`);

  /* STEP 1 deploy UniswapSimplePriceOracle (Pancakeswap) */
  const uniswapSimplePriceOracle = await ethers.getContractFactory(
    "UniswapSimplePriceOracle"
  );
  const UniswapSimplePriceOracle = await uniswapSimplePriceOracle.deploy(
    "0x6725F303b657a9451d8BA641348b6761A6CC7a17" // Testnet Pancakeswap factory
  );
  console.log(
    `UniswapSimplePriceOracle address: ${UniswapSimplePriceOracle.address}`
  );
  const UniswapSimplePriceOracleData = {
    address: UniswapSimplePriceOracle.address,
    abi: JSON.parse(UniswapSimplePriceOracle.interface.format("json")),
  };
  fs.writeFileSync(
    "deployment/UniswapSimplePriceOracle.json",
    JSON.stringify(UniswapSimplePriceOracleData)
  );

  /* STEP 2 deploy MatchingMarket */
  const matchingMarket = await ethers.getContractFactory("MatchingMarket");
  const MatchingMarket = await matchingMarket.deploy(
    "0x8301f2213c0eed49a7e28ae4c3e91722919b8b47", // Testnet BUSD address dust token
    ethers.utils.parseEther("100"), // 100 dust limit (100000000000000000000 in wei), BUSD has 18 decimals (https://testnet.bscscan.com/token/0x8301f2213c0eed49a7e28ae4c3e91722919b8b47)
    UniswapSimplePriceOracle.address // from step 1 deployed UniswapSimplePriceOracle
  );
  console.log(`MatchingMarket address: ${MatchingMarket.address}`);
  const MatchingMarketData = {
    address: MatchingMarket.address,
    abi: JSON.parse(MatchingMarket.interface.format("json")),
  };
  fs.writeFileSync(
    "deployment/MatchingMarket.json",
    JSON.stringify(MatchingMarketData)
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
