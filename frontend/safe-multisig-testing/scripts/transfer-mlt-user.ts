import { ethers } from "hardhat";

async function main() {
  const lockAddress = process.env.LOCK_CONTRACT_ADDRESS;
  const adminKey = process.env.ADMIN_KEY;
  const userAddress = process.env.USER_ADDRESS;
  const user2Address = process.env.USER2_ADDRESS;

  if (!lockAddress || !adminKey || !user2Address) {
    console.error("Please set LOCK_CONTRACT_ADDRESS, ADMIN_KEY, and USER2_ADDRESS in your .env file");
    process.exit(1);
  }

  const adminWallet = new ethers.Wallet(adminKey, ethers.provider);
  console.log("Transferring tokens from account:", adminWallet.address);

  const lock = await ethers.getContractAt("Lock", lockAddress, adminWallet);

  const amountToTransfer = ethers.parseEther("100"); // 100 MLT

  console.log(`Transferring ${ethers.formatEther(amountToTransfer)} MLT from ${adminWallet.address} to ${user2Address}...`);

  const tx = await lock.transferApproved(userAddress, user2Address, amountToTransfer);
  await tx.wait();

  console.log("Transfer successful!");
  console.log(`Admin balance: ${ethers.formatEther(await lock.balanceOf(adminWallet.address))} MLT`);
  console.log(`User balance: ${ethers.formatEther(await lock.balanceOf(user2Address))} MLT`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});