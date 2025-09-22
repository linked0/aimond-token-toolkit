import { ethers } from "hardhat";

async function main() {
  const lockAddress = process.env.LOCK_CONTRACT_ADDRESS;
  const gnosisSafeAddress = process.env.GNOSIS_SAFE_ADDRESS;
  const user2Address = process.env.USER2_ADDRESS;
  const adminKey = process.env.ADMIN_KEY; // Private key of one of the Gnosis Safe owners

  if (!lockAddress || !gnosisSafeAddress || !user2Address || !adminKey) {
    console.error("Please set LOCK_CONTRACT_ADDRESS, GNOSIS_SAFE_ADDRESS, USER2_ADDRESS, and ADMIN_KEY in your .env file");
    process.exit(1);
  }

  const adminWallet = new ethers.Wallet(adminKey, ethers.provider);
  console.log("Initiating Gnosis Safe transaction approval with Admin account:", adminWallet.address);

  const lock = await ethers.getContractAt("Lock", lockAddress, adminWallet);
  const gnosisSafe = await ethers.getContractAt("GnosisSafe", gnosisSafeAddress, adminWallet);

  const transferAmount = ethers.parseEther("100"); // 100 MLT

  // Encode the call to Lock.transferApproved(USER2_ADDRESS, amount)
  const callData = lock.interface.encodeFunctionData("transferApproved", [adminWallet.address, user2Address, transferAmount]);

  // Get current gas price from provider
  const currentGasPrice = (await ethers.provider.getFeeData()).gasPrice;
  const gasPrice = currentGasPrice ? currentGasPrice : ethers.parseUnits("10", "gwei"); // Fallback to 10 Gwei if current is null

  console.log("Using gas price:", ethers.formatUnits(gasPrice, "gwei"), "gwei");

  // Construct the Gnosis Safe transaction
  const safeTx = {
    to: lock.target, // The Lock contract address
    value: 0, // No ETH transfer
    data: callData,
    operation: 0, // CALL
    safeTxGas: 500000, // A generous estimate, adjust as needed
    baseGas: 100000, // A generous estimate, adjust as needed
    gasPrice: gasPrice, // Use a realistic gas price
    gasToken: ethers.ZeroAddress,
    refundReceiver: ethers.ZeroAddress,
    nonce: await gnosisSafe.nonce(),
  };

  // Get the hash of the Gnosis Safe transaction
  const txHash = await gnosisSafe.getTransactionHash(
    safeTx.to,
    safeTx.value,
    safeTx.data,
    safeTx.operation,
    safeTx.safeTxGas,
    safeTx.baseGas,
    safeTx.gasPrice,
    safeTx.gasToken,
    safeTx.refundReceiver,
    safeTx.nonce
  );

  console.log("\n--- Admin Approval Details ---");
  console.log("Safe Transaction Hash:", txHash);
  console.log("Safe Transaction (JSON):", JSON.stringify(safeTx, (key, value) =>
    typeof value === 'bigint' ? value.toString() : value
  , 2));

  console.log("Sending on-chain approval from Admin...");
  const approveTx = await gnosisSafe.approveHash(txHash);
  await approveTx.wait();
  console.log("Admin has approved the transaction on-chain.");
  console.log("\nThis transaction is now pending for the second signature. Please use the User's script to add the second signature and execute.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});