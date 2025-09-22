import { ethers } from "hardhat";

async function main() {
  const lockAddress = process.env.LOCK_CONTRACT_ADDRESS;
  const gnosisSafeAddress = process.env.GNOSIS_SAFE_ADDRESS;
  const user2Address = process.env.USER2_ADDRESS;
  const userKey = process.env.USER_KEY; // Private key of the second Gnosis Safe owner

  // Input from the admin's script
  const safeTxJson = process.env.SAFE_TX_JSON; // JSON string of the safeTx object
  const txHash = process.env.TX_HASH; // Transaction hash from admin's script
  const adminAddress = process.env.ADMIN_ADDRESS; // Admin's address (needed for on-chain signature construction)

  if (!lockAddress || !gnosisSafeAddress || !user2Address || !userKey || !safeTxJson || !txHash || !adminAddress) {
    console.error("Please set LOCK_CONTRACT_ADDRESS, GNOSIS_SAFE_ADDRESS, USER2_ADDRESS, USER_KEY, SAFE_TX_JSON, TX_HASH, and ADMIN_ADDRESS in your .env file");
    process.exit(1);
  }

  const userWallet = new ethers.Wallet(userKey, ethers.provider);
  console.log("Adding second signature and executing with Gnosis Safe owner account (User):", userWallet.address);

  const lock = await ethers.getContractAt("Lock", lockAddress, userWallet);
  const gnosisSafe = await ethers.getContractAt("GnosisSafe", gnosisSafeAddress, userWallet);

  const safeTx = JSON.parse(safeTxJson, (key, value) => {
    if (key === 'value' || key.endsWith('Gas') || key === 'gasPrice' || key === 'nonce') {
      return BigInt(value);
    }
    return value;
  });

  // Define the EIP-712 domain and types for signing
  const domain = {
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: gnosisSafe.target,
  };

  const types = {
    SafeTx: [
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "data", type: "bytes" },
      { name: "operation", type: "uint8" },
      { name: "safeTxGas", type: "uint256" },
      { name: "baseGas", type: "uint256" },
      { name: "gasPrice", type: "uint256" },
      { name: "gasToken", type: "address" },
      { name: "refundReceiver", type: "address" },
      { name: "nonce", type: "uint256" },
    ],
  };

  // Sign the transaction hash with the user's wallet
  const userSignature = await userWallet.signTypedData(domain, types, safeTx);

  // Gnosis Safe expects signatures to be sorted by address.
  // For on-chain approvals (like from the admin), the signature is represented by
  // the approver's address (r) and a v value of 1. The s value is 0.
  const adminOnChainSignature = ethers.solidityPacked(
    ['bytes32', 'bytes32', 'uint8'], // Correct types for r, s, v
    [ethers.zeroPadValue(adminAddress, 32), ethers.ZeroHash, 1] // r = adminAddress (padded), s = 0, v = 1
  );

  // Combine and sort signatures by signer address
  const signaturesWithAddresses = [
    { signature: userSignature, signerAddress: userWallet.address },
    { signature: adminOnChainSignature, signerAddress: adminAddress }
  ];

  signaturesWithAddresses.sort((a, b) => a.signerAddress.toLowerCase().localeCompare(b.signerAddress.toLowerCase()));

  const finalSignatures = ethers.concat(signaturesWithAddresses.map(s => s.signature));

  console.log(`Current Lock token balance of Gnosis Safe: ${ethers.formatEther(await lock.balanceOf(gnosisSafeAddress))} MLT`);
  console.log(`Current Lock token balance of User2: ${ethers.formatEther(await lock.balanceOf(user2Address))} MLT`);

  // console.log(`Executing Gnosis Safe transaction to transfer ${ethers.formatEther(ethers.BigNumber.from(safeTx.safeTxGas).isZero() ? 0 : ethers.BigNumber.from(safeTx.safeTxGas).mul(ethers.BigNumber.from(safeTx.gasPrice)).div(ethers.BigNumber.from(10).pow(18)))} MLT...`);

  // Execute the transaction through the Gnosis Safe
  const tx = await gnosisSafe.execTransaction(
    safeTx.to,
    safeTx.value,
    safeTx.data,
    safeTx.operation,
    safeTx.safeTxGas,
    safeTx.baseGas,
    safeTx.gasPrice,
    safeTx.gasToken,
    safeTx.refundReceiver,
    finalSignatures
  );
  await tx.wait();

  console.log("Transfer initiated via Gnosis Safe successfully!");
  console.log(`New Lock token balance of Gnosis Safe: ${ethers.formatEther(await lock.balanceOf(gnosisSafeAddress))} MLT`);
  console.log(`New Lock token balance of User2: ${ethers.formatEther(await lock.balanceOf(user2Address))} MLT`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});