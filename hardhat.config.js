require("dotenv").config();

require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("hardhat-contract-sizer");
require("solidity-coverage");
require('@openzeppelin/hardhat-upgrades')

const PK = `0x${"32c069bf3d38a060eacdc072eecd4ef63f0fc48895afbacbe185c97037789875"}`

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    version: "0.8.10",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    goerli: {
      url: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      accounts: [process.env.PK || PK],
      chainId: 5,
      gasPrice: 7000000000,
      timeout: 10000000
    },
    goerliStaging: {
      url: 'https://goerli.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161',
      accounts: [process.env.PK || PK],
      chainId: 5,
      gasPrice: 7000000000,
      timeout: 10000000
    },
    ropsten: {
      // Infura public nodes
      url: 'https://ropsten.infura.io/v3/3bf15b15a0a74588b3bb3e455375fb54',
      accounts: [process.env.PK || PK],
      chainId: 3,
      gasPrice: 40000000000,
      timeout: 500000
    },
    bscTestnet: {
      url: 'https://data-seed-prebsc-1-s1.binance.org:8545/',
      accounts: [process.env.PK || PK],
      chainId: 97,
      gasPrice: 40000000000,
      timeout: 500000
    },
    bscMainnetStaging: {
      url: 'https://bsc-dataseed.binance.org/',
      accounts: [process.env.PK || PK],
      chainId: 56,
      gasPrice: 7000000000,
      timeout: 10000000
    },
    bscMainnet: {
      url: 'https://bsc-dataseed.binance.org/',
      accounts: [process.env.PK || PK],
      chainId: 56,
      gasPrice: 7000000000,
      timeout: 10000000
    },
    local: {
      url: 'http://localhost:8545',
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
