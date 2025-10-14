import { ethers } from 'ethers';
import pool from '../src/database/db';
import { PgMerkleDistributionRepository } from '../src/repositories/pg/PgMerkleDistributionRepository';
import { PgMerkleProofRepository } from '../src/repositories/pg/PgMerkleProofRepository';
import { PgUserRepository } from '../src/repositories/pg/PgUserRepository';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';

const merkleDistributionRepository = new PgMerkleDistributionRepository(pool);
const merkleProofRepository = new PgMerkleProofRepository(pool);
const userRepository = new PgUserRepository(pool);

async function debugLeafMismatch() {
  console.log('🔍 [DebugLeafMismatch] Starting comprehensive leaf debugging...');
  
  try {
    const userAddress = '0x41347A026E28f532Ca464bd4FfFa451bF1aA5307';
    const amount = '1000000000000000000000';
    
    console.log(`User: ${userAddress}`);
    console.log(`Amount: ${amount}`);
    
    // Get user from database
    const user = await userRepository.findByWalletAddress(userAddress);
    if (!user) {
      console.log('❌ User not found in database');
      return;
    }
    console.log(`✅ User found with ID: ${user.user_id}`);
    
    // Get active distribution
    const activeDistribution = await merkleDistributionRepository.findActive();
    if (!activeDistribution) {
      console.log('❌ No active distribution found');
      return;
    }
    console.log(`✅ Active distribution: ${activeDistribution.distribution_id}`);
    
    // Get user's proof
    const merkleProof = await merkleProofRepository.findByDistributionAndUser(activeDistribution.distribution_id, user.user_id);
    if (!merkleProof) {
      console.log('❌ No proof found for user');
      return;
    }
    console.log(`✅ Proof found with amount: ${merkleProof.amount}`);
    
    // Test different leaf generation methods
    console.log('\n🔍 Testing leaf generation methods:');
    
    // Method 1: solidityPackedKeccak256 (what we're using now)
    const leaf1 = ethers.solidityPackedKeccak256(['address', 'uint256'], [userAddress, amount]);
    console.log(`Method 1 (solidityPackedKeccak256): ${leaf1}`);
    
    // Method 2: keccak256(solidityPacked(...)) (what we used before)
    const leaf2 = ethers.keccak256(ethers.solidityPacked(['address', 'uint256'], [userAddress, amount]));
    console.log(`Method 2 (keccak256(solidityPacked)): ${leaf2}`);
    
    // Method 3: Using BigInt for amount
    const leaf3 = ethers.solidityPackedKeccak256(['address', 'uint256'], [userAddress, ethers.toBigInt(amount)]);
    console.log(`Method 3 (with BigInt): ${leaf3}`);
    
    // Method 4: Using parseUnits
    const leaf4 = ethers.solidityPackedKeccak256(['address', 'uint256'], [userAddress, ethers.parseUnits(amount, 0)]);
    console.log(`Method 4 (with parseUnits): ${leaf4}`);
    
    // Check which method matches the proof
    console.log('\n🔍 Checking which method matches the stored proof:');
    console.log(`Method 1 matches: ${leaf1 === merkleProof.proof[0]}`);
    console.log(`Method 2 matches: ${leaf2 === merkleProof.proof[0]}`);
    console.log(`Method 3 matches: ${leaf3 === merkleProof.proof[0]}`);
    console.log(`Method 4 matches: ${leaf4 === merkleProof.proof[0]}`);
    
    // Now let's regenerate the tree with the correct method and see what proof we get
    console.log('\n🔍 Regenerating tree with correct method:');
    
    // Get all users and their allocations (simplified version)
    const allUsers = await userRepository.findAll();
    const userAllocationsMap = new Map<number, { walletAddress: string, cumulativeAmount: bigint }>();
    
    // For this test, let's just use the one user we're testing
    userAllocationsMap.set(user.user_id, {
      walletAddress: userAddress,
      cumulativeAmount: ethers.toBigInt(amount)
    });
    
    // Generate leaves using the correct method
    const leaves = Array.from(userAllocationsMap.values()).map(data =>
      ethers.solidityPackedKeccak256(['address', 'uint256'], [data.walletAddress, data.cumulativeAmount])
    );
    
    console.log(`Generated leaves: ${leaves}`);
    
    // Create tree
    const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
    const merkleRoot = tree.getHexRoot();
    
    console.log(`Generated Merkle root: ${merkleRoot}`);
    console.log(`Database Merkle root: ${activeDistribution.merkle_root}`);
    console.log(`Roots match: ${merkleRoot === activeDistribution.merkle_root}`);
    
    // Generate proof for our user
    const correctLeaf = ethers.solidityPackedKeccak256(['address', 'uint256'], [userAddress, ethers.toBigInt(amount)]);
    const correctProof = tree.getHexProof(correctLeaf);
    
    console.log(`\nCorrect proof for user:`);
    console.log(`Leaf: ${correctLeaf}`);
    console.log(`Proof: ${JSON.stringify(correctProof, null, 2)}`);
    
    console.log(`\nStored proof:`);
    console.log(`Leaf (first element): ${merkleProof.proof[0]}`);
    console.log(`Proof: ${JSON.stringify(merkleProof.proof, null, 2)}`);
    
    console.log(`\nProofs match: ${JSON.stringify(correctProof) === JSON.stringify(merkleProof.proof)}`);
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await pool.end();
  }
}

// Run the debug script
debugLeafMismatch().catch(console.error);