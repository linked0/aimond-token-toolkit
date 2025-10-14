import { ethers } from 'ethers';

function testLeafGeneration() {
  console.log('🔍 [TestLeafGeneration] Testing leaf generation in isolation...');
  
  const userAddress = '0x41347A026E28f532Ca464bd4FfFa451bF1aA5307';
  const amount = '1000000000000000000000';
  
  console.log('User:', userAddress);
  console.log('Amount:', amount);
  
  // Method 1: solidityPackedKeccak256 (what we're using now)
  const leaf1 = ethers.solidityPackedKeccak256(['address', 'uint256'], [userAddress, amount]);
  console.log('Method 1 (solidityPackedKeccak256):', leaf1);
  
  // Method 2: keccak256(solidityPacked(...)) (what we used before)
  const leaf2 = ethers.keccak256(ethers.solidityPacked(['address', 'uint256'], [userAddress, amount]));
  console.log('Method 2 (keccak256(solidityPacked)):', leaf2);
  
  // Method 3: Using BigInt for amount
  const leaf3 = ethers.solidityPackedKeccak256(['address', 'uint256'], [userAddress, ethers.toBigInt(amount)]);
  console.log('Method 3 (with BigInt):', leaf3);
  
  // Method 4: Using parseUnits
  const leaf4 = ethers.solidityPackedKeccak256(['address', 'uint256'], [userAddress, ethers.parseUnits(amount, 0)]);
  console.log('Method 4 (with parseUnits):', leaf4);
  
  // Check if methods are the same
  console.log('Methods 1 and 2 match:', leaf1 === leaf2);
  console.log('Methods 1 and 3 match:', leaf1 === leaf3);
  console.log('Methods 1 and 4 match:', leaf1 === leaf4);
  
  // The proof from database
  const proofFromDB = '0xaa3535cba132f6e89284e1ebba8f71db7404711bd7bff3458381e16de2a26640';
  console.log('Proof from DB:', proofFromDB);
  
  // Check if any method matches the proof
  console.log('Method 1 matches proof:', leaf1 === proofFromDB);
  console.log('Method 2 matches proof:', leaf2 === proofFromDB);
  console.log('Method 3 matches proof:', leaf3 === proofFromDB);
  console.log('Method 4 matches proof:', leaf4 === proofFromDB);
  
  // Let's also test with the exact same data that might be in the database
  const amountBigInt = ethers.toBigInt(amount);
  console.log('\nTesting with BigInt amount:', amountBigInt.toString());
  
  const leaf5 = ethers.solidityPackedKeccak256(['address', 'uint256'], [userAddress, amountBigInt]);
  console.log('Method 5 (with BigInt from toBigInt):', leaf5);
  console.log('Method 5 matches proof:', leaf5 === proofFromDB);
}

testLeafGeneration();