import { ethers } from 'ethers';

function verifyLeafGeneration() {
  console.log('🔍 [VerifyLeafGeneration] Testing leaf generation methods...');
  
  const userAddress = '0x41347A026E28f532Ca464bd4FfFa451bF1aA5307';
  const amount = '1000000000000000000000';
  
  console.log('User:', userAddress);
  console.log('Amount:', amount);
  
  // Method 1: solidityPackedKeccak256 (old, incorrect)
  const leaf1 = ethers.solidityPackedKeccak256(['address', 'uint256'], [userAddress, amount]);
  console.log('Method 1 (solidityPackedKeccak256):', leaf1);
  
  // Method 2: keccak256(solidityPacked(...)) (new, correct)
  const leaf2 = ethers.keccak256(ethers.solidityPacked(['address', 'uint256'], [userAddress, amount]));
  console.log('Method 2 (keccak256(solidityPacked)):', leaf2);
  
  // Method 3: Manual abi.encodePacked equivalent
  const packed = ethers.solidityPacked(['address', 'uint256'], [userAddress, amount]);
  const leaf3 = ethers.keccak256(packed);
  console.log('Method 3 (manual):', leaf3);
  
  // Check if methods 2 and 3 are the same
  console.log('Methods 2 and 3 match:', leaf2 === leaf3);
  
  // The proof from database
  const proofFromDB = '0xaa3535cba132f6e89284e1ebba8f71db7404711bd7bff3458381e16de2a26640';
  console.log('Proof from DB:', proofFromDB);
  
  // Check if any method matches the proof
  console.log('Method 1 matches proof:', leaf1 === proofFromDB);
  console.log('Method 2 matches proof:', leaf2 === proofFromDB);
  console.log('Method 3 matches proof:', leaf3 === proofFromDB);
}

verifyLeafGeneration();