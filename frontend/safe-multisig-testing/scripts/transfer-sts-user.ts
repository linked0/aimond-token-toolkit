import { ethers, network } from "hardhat";
import { createSafeClient } from "@safe-global/sdk-starter-kit";

async function main() {
  const lockAddress = process.env.LOCK_CONTRACT_ADDRESS;
  const gnosisSafeAddress = process.env.GNOSIS_SAFE_ADDRESS;
  const user2Address = process.env.USER2_ADDRESS;
  const userKey = process.env.USER_KEY; // Private key of the user (confirmer/executor)
  const safeApiKey = process.env.SAFE_API_KEY; // API key for Safe Transaction Service

  // The safeTxHash from the admin's script is needed to identify the specific transaction
  const safeTxHashToConfirm = process.env.SAFE_TX_HASH_TO_CONFIRM; 

  if (!lockAddress || !gnosisSafeAddress || !user2Address || !userKey || !safeApiKey || !safeTxHashToConfirm) {
    console.error("Please set LOCK_CONTRACT_ADDRESS, GNOSIS_SAFE_ADDRESS, USER2_ADDRESS, USER_KEY, SAFE_API_KEY, and SAFE_TX_HASH_TO_CONFIRM in your .env file");
    process.exit(1);
  }

  const userWallet = new ethers.Wallet(userKey, ethers.provider);
  console.log("Confirming and executing Gnosis Safe transaction with User account:", userWallet.address);

  const rpcUrl = (network.config as { url?: string }).url;
  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for network ${network.name}`);
  }
  // Initialize SafeClient for the user
  const safeClient = await createSafeClient({
    provider: rpcUrl,
    signer: userKey,
    safeAddress: gnosisSafeAddress,
    apiKey: safeApiKey,
  });

  const lock = await ethers.getContractAt("Lock", lockAddress, userWallet);

  console.log(`Current Lock token balance of Gnosis Safe: ${ethers.formatEther(await lock.balanceOf(gnosisSafeAddress))} MLT`);
  console.log(`Current Lock token balance of User2: ${ethers.formatEther(await lock.balanceOf(user2Address))} MLT`);

  console.log(`Fetching pending transaction with hash ${safeTxHashToConfirm}...`);

  // Confirm the transaction (adds user's signature and executes if threshold met)
  const txResponse = await safeClient.confirm({
    safeTxHash: safeTxHashToConfirm,
  });

  await txResponse.transactionResponse?.wait();

  console.log("Transfer initiated via Gnosis Safe successfully!");
  console.log(`New Lock token balance of Gnosis Safe: ${ethers.formatEther(await lock.balanceOf(gnosisSafeAddress))} MLT`);
  console.log(`New Lock token balance of User2: ${ethers.formatEther(await lock.balanceOf(user2Address))} MLT`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});