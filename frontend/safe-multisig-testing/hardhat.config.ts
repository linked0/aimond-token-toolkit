import { config as dotEnvConfig } from "dotenv";
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import { Wallet, parseEther } from "ethers";
import { HardhatNetworkAccountUserConfig } from "hardhat/types/config";

dotEnvConfig({ path: process.env.ENV_FILE || ".env" });

function getAccounts() {
  const accounts: HardhatNetworkAccountUserConfig[] = [];
  const defaultBalance = parseEther("2000000").toString();

  const n = 10;
  for (let i = 0; i < n; ++i) {
    accounts.push({
      privateKey: Wallet.createRandom().privateKey,
      balance: defaultBalance,
    });
  }
  accounts[0].privateKey = process.env.ADMIN_KEY || "";
  accounts[1].privateKey = process.env.USER_KEY || "";

  return accounts;
}

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.7.6", // Gnosis Safe contracts use 0.7.6
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      },
      {
        version: "0.5.17", // For ViewStorageAccessible.sol
        settings: {
          optimizer: {
            enabled: true,
            runs: 200
          }
        }
      }
    ]
  },
  paths: {
    sources: "./contracts",
    cache: "./cache",
    artifacts: "./artifacts",
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      accounts: getAccounts(),
    },
    localnet: {
      url: "http://127.0.0.1:8545",
      chainId: 31337, // 31337 is the default chain ID for Hardhat local network
      accounts: [
        process.env.ADMIN_KEY || "",
        process.env.USER_KEY || "",
      ],
    },
    bsc: {
      url: "https://bsc-dataseed1.binance.org/",
      chainId: 56,
      accounts: [
        process.env.ADMIN_KEY || "",
        process.env.USER_KEY || "",
      ],
    },
    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: [
        process.env.ADMIN_KEY || "",
        process.env.USER_KEY || "",
      ],
    },
    sepolia: {
      url: process.env.SEPOLIA_URL || "",
      chainId: 11155111,
      accounts: [
        process.env.ADMIN_KEY || "",
        process.env.USER_KEY || "",
      ],
    }
  }
};
export default config;