import { ethers } from 'ethers';

function checkOldMethod() {
  console.log('🔍 [CheckOldMethod] Testing old leaf generation method...');
  
  const userAddress = '0x41347A026E28f532Ca464bd4FfFa451bF1aA5307';
  const amount = '1000000000000000000000';
  
  console.log('User:', userAddress);
  console.log('Amount:', amount);
  
  // The old method that was used before (solidityPackedKeccak256)
  const oldLeaf = ethers.solidityPackedKeccak256(['address', 'uint256'], [userAddress, amount]);
  console.log('Old method (solidityPackedKeccak256):', oldLeaf);
  
  // The proof from database
  const proofFromDB = '0xaa3535cba132f6e89284e1ebba8f71db7404711bd7bff3458381e16de2a26640';
  console.log('Proof from DB:', proofFromDB);
  
  // Check if they match
  console.log('Old method matches proof:', oldLeaf === proofFromDB);
  
  // Let's also check if the issue is with the address format
  const checksumAddress = ethers.getAddress(userAddress);
  console.log('Checksum address:', checksumAddress);
  
  const oldLeafWithChecksum = ethers.solidityPackedKeccak256(['address', 'uint256'], [checksumAddress, amount]);
  console.log('Old method with checksum:', oldLeafWithChecksum);
  console.log('Old method with checksum matches proof:', oldLeafWithChecksum === proofFromDB);
  
  // Let's also check the amount format
  const amountAsBigInt = BigInt(amount);
  console.log('Amount as BigInt:', amountAsBigInt.toString());
  
  const oldLeafWithBigInt = ethers.solidityPackedKeccak256(['address', 'uint256'], [userAddress, amountAsBigInt]);
  console.log('Old method with BigInt:', oldLeafWithBigInt);
  console.log('Old method with BigInt matches proof:', oldLeafWithBigInt === proofFromDB);
}

checkOldMethod();