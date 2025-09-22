import { ethers } from "hardhat";

async function main() {
  const lockAddress = process.env.LOCK_CONTRACT_ADDRESS;
  const gnosisSafeAddress = process.env.GNOSIS_SAFE_ADDRESS;

  if (!lockAddress || !gnosisSafeAddress) {
    console.error("Please set LOCK_CONTRACT_ADDRESS and GNOSIS_SAFE_ADDRESS in your .env file");
    process.exit(1);
  }

  const [deployer] = await ethers.getSigners();
  console.log("Transferring ownership from account:", deployer.address);

  const lock = await ethers.getContractAt("Lock", lockAddress);

  console.log("Current Lock owner:", await lock.owner());

  const transferTx = await lock.transferOwnership(gnosisSafeAddress);
  await transferTx.wait();

  console.log("New Lock owner:", await lock.owner());
  console.log(`Ownership of Lock contract (${lockAddress}) transferred to Gnosis Safe (${gnosisSafeAddress})`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});