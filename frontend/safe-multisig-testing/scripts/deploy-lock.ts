import { ethers } from "hardhat";

async function main() {
  const initialSupply = ethers.parseEther("1000000"); // Example initial supply
  const [deployer] = await ethers.getSigners();

  console.log("Deploying Lock contract with the account:", deployer.address);

  const Lock = await ethers.getContractFactory("Lock");
  const lock = await Lock.deploy("MyLockToken", "MLT", initialSupply, deployer.address);

  await lock.waitForDeployment();

  console.log("Lock contract deployed to:", lock.target);
  console.log("Initial supply:", ethers.formatEther(await lock.totalSupply()));
  console.log("Lock owner:", await lock.owner());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});