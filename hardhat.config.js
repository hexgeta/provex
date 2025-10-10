require("@nomicfoundation/hardhat-toolbox");
require("@nomicfoundation/hardhat-verify");
require("dotenv").config();

const config = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    // Production networks
    pulsechain: {
      url: process.env.PULSECHAIN_RPC || "https://rpc.pulsechain.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 369,
    },
    pulsechainTestnet: {
      url: process.env.PULSECHAIN_TESTNET_RPC || "https://rpc-testnet.pulsechain.com",
      accounts: process.env.PRIVATE_KEY ? [process.env.PRIVATE_KEY] : [],
      chainId: 943,
    },
    
    // Local testing forks (both ETH and PLS forks use same port)
    localhost: {
      url: "http://127.0.0.1:8545",  // Standard Hardhat port for forks
      chainId: 31337,                 // Hardhat's default chain ID
    },
    // Note: These network configs are just for reference
    // The actual forks are started with the npm scripts below
  },
  etherscan: {
    apiKey: {
      pulsechain: process.env.PULSESCAN_API_KEY || "",
      pulsechainTestnet: process.env.PULSESCAN_API_KEY || "",
    },
    customChains: [
      {
        network: "pulsechain",
        chainId: 369,
        urls: {
          apiURL: "https://scan.pulsechain.com/api",
          browserURL: "https://scan.pulsechain.com",
        },
      },
      {
        network: "pulsechainTestnet",
        chainId: 943,
        urls: {
          apiURL: "https://scan.v4.testnet.pulsechain.com/api",
          browserURL: "https://scan.v4.testnet.pulsechain.com",
        },
      },
    ],
  },
};

module.exports = config; 