import { ethers } from "hardhat";

async function main() {
  const lockAddress = process.env.LOCK_CONTRACT_ADDRESS;
  const adminKey = process.env.ADMIN_KEY;
  const adminAddress = process.env.ADMIN_ADDRESS;
  const userAddress = process.env.USER_ADDRESS;

  if (!lockAddress || !adminKey || !userAddress) {
    console.error("Please set LOCK_CONTRACT_ADDRESS, ADMIN_KEY, and USER_ADDRESS in your .env file");
    process.exit(1);
  }

  const adminWallet = new ethers.Wallet(adminKey, ethers.provider);
  console.log("Transferring tokens from account:", adminWallet.address);

  const lock = await ethers.getContractAt("Lock", lockAddress, adminWallet);

  const amountToTransfer = ethers.parseEther("1000"); // 1000 MLT

  console.log(`Transferring ${ethers.formatEther(amountToTransfer)} MLT from ${adminWallet.address} to ${userAddress}...`);

  const tx = await lock.transferApproved(adminAddress, userAddress, amountToTransfer);
  await tx.wait();

  console.log("Transfer successful!");
  console.log(`Admin balance: ${ethers.formatEther(await lock.balanceOf(adminWallet.address))} MLT`);
  console.log(`User balance: ${ethers.formatEther(await lock.balanceOf(userAddress))} MLT`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});