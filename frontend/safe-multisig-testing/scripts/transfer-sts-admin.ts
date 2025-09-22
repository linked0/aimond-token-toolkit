import { ethers, network } from "hardhat";
import { createSafeClient } from "@safe-global/sdk-starter-kit";

async function main() {
  const lockAddress = process.env.LOCK_CONTRACT_ADDRESS;
  const gnosisSafeAddress = process.env.GNOSIS_SAFE_ADDRESS;
  const user2Address = process.env.USER2_ADDRESS;
  const adminKey = process.env.ADMIN_KEY; // Private key of the admin (proposer)
  const safeApiKey = process.env.SAFE_API_KEY; // API key for Safe Transaction Service

  if (!lockAddress || !gnosisSafeAddress || !user2Address || !adminKey || !safeApiKey) {
    console.error("Please set LOCK_CONTRACT_ADDRESS, GNOSIS_SAFE_ADDRESS, USER2_ADDRESS, ADMIN_KEY, and SAFE_API_KEY in your .env file");
    process.exit(1);
  }

  const adminWallet = new ethers.Wallet(adminKey, ethers.provider);
  console.log("Proposing Gnosis Safe transaction with Admin account:", adminWallet.address);

  const rpcUrl = (network.config as { url?: string }).url;
  if (!rpcUrl) {
    throw new Error(`No RPC URL configured for network ${network.name}`);
  }

  // Initialize SafeClient for the admin
  const safeClient = await createSafeClient({
    provider: rpcUrl,
    signer: adminKey,
    safeAddress: gnosisSafeAddress,
    apiKey: safeApiKey,
  });

  const lock = await ethers.getContractAt("Lock", lockAddress, adminWallet);

  const transferAmount = ethers.parseEther("100"); // 100 MLT

  // Encode the call to Lock.transferApproved(USER2_ADDRESS, amount)
  const callData = lock.interface.encodeFunctionData("transferApproved", [adminWallet.address, user2Address, transferAmount]);

  const transactions = [{
    to: lock.target as string,
    data: callData,
    value: "0", // No ETH transfer
  }];

  console.log(`Current Lock token balance of Gnosis Safe: ${ethers.formatEther(await lock.balanceOf(gnosisSafeAddress))} MLT`);
  console.log(`Current Lock token balance of User2: ${ethers.formatEther(await lock.balanceOf(user2Address))} MLT`);

  console.log(`Proposing Gnosis Safe transaction to transfer ${ethers.formatEther(transferAmount)} MLT...`);

  // Send the Safe transaction (proposes to STS and signs with adminKey)
  const txResult = await safeClient.send({ transactions });
  
  if (txResult.transactions?.safeTxHash) {
    console.log(`Safe transaction proposed to STS with hash: ${txResult.transactions.safeTxHash}`);
    console.log("\nThis transaction is now pending in the Safe Transaction Service.");
    console.log("You can view it in the Safe Web UI or use the User's script to confirm and execute.");
    console.log("Copy this hash for the User's script: ", txResult.transactions.safeTxHash);
  } else if (txResult.transactionResponse) {
    // This case might happen if threshold is 1 and it gets executed immediately
    await txResult.transactionResponse.wait();
    console.log("Transaction executed immediately (threshold 1-of-1).");
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});