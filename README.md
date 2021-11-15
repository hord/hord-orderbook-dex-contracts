# Advanced Sample Hardhat Project

This project demonstrates an advanced Hardhat use case, integrating other tools commonly used alongside Hardhat in the ecosystem.

The project comes with a sample contract, a test for that contract, a sample script that deploys that contract, and an example of a task implementation, which simply lists the available accounts. It also comes with a variety of other tools, preconfigured to work with the project code.

Try running some of the following tasks:

```shell
npx hardhat accounts
npx hardhat compile
npx hardhat clean
npx hardhat test
npx hardhat node
npx hardhat help
REPORT_GAS=true npx hardhat test
npx hardhat coverage
npx hardhat run scripts/deploy.js
node scripts/deploy.js
npx eslint '**/*.js'
npx eslint '**/*.js' --fix
npx prettier '**/*.{json,sol,md}' --check
npx prettier '**/*.{json,sol,md}' --write
npx solhint 'contracts/**/*.sol'
npx solhint 'contracts/**/*.sol' --fix
```

# Etherscan verification

To try out Etherscan verification, you first need to deploy a contract to an Ethereum network that's supported by Etherscan, such as Ropsten.

In this project, copy the .env.example file to a file named .env, and then edit it to fill in the details. Enter your Etherscan API key, your Ropsten node URL (eg from Alchemy), and the private key of the account which will send the deployment transaction. With a valid .env file in place, first deploy your contract:

```shell
hardhat run --network ropsten scripts/deploy.js
```

Then, copy the deployment address and paste it in to replace `DEPLOYED_CONTRACT_ADDRESS` in this command:

```shell
npx hardhat verify --network ropsten DEPLOYED_CONTRACT_ADDRESS "Hello, Hardhat!"
```

# This is a simple on-chain OTC market for ERC20-compatible tokens.

This repository contains implementation of the protocol to exchange ERC20 compliant tokens using fully decentralized, on-chain order book and matching engine. The protocol is used by OasisDEX, eth2dai.com and many other DeFi projects. 


## Development

```
./scripts/run-tests.sh # run unit tests
./scripts/run-live-tests.sh # runs tests against the mainnet
```

## Design Consideration

The protocol uses on-chain order book and matching engine. The primary advantage of such approach is that the liquidity is avaiable for other smart contracts that can access it in one atomic ethereum transaction. The second advantage is that the protocol is fully decentralized without any need for an operator. 

Order book for each market is implemented as two double-linked sorted lists, one for each side of the market. At any one time the list should be sorted. 

The second important design choice is the use of the Escrow model for Makers - every order on the order book needs to be "backed up" by the liquidity that is escrowed in the contract. Although such approach locks down liquidity, it guarantees zero-risk, instantenous settlement. 

## API

Please refer to https://oasisdex.com/docs/references/smart-contract
