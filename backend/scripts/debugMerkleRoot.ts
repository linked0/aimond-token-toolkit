import { ethers } from 'ethers';
import { loyaltyPointAddress, loyaltyPointABI } from '../src/constants/contracts';
import { chains } from '../src/constants/chains';
import pool from '../src/database/db';
import { PgMerkleDistributionRepository } from '../src/repositories/pg/PgMerkleDistributionRepository';
import { generateMerkleTree } from '../src/services/merkleTreeService';

const merkleDistributionRepository = new PgMerkleDistributionRepository(pool);

async function debugMerkleRoot() {
  console.log('🔍 [DebugMerkleRoot] Starting Merkle root debugging...');
  
  try {
    // 1. Get current Merkle root from database
    const activeDistribution = await merkleDistributionRepository.findActive();
    if (!activeDistribution) {
      console.log('❌ [DebugMerkleRoot] No active distribution found in database');
      return;
    }
    
    console.log(`📊 [DebugMerkleRoot] Database Merkle Root: ${activeDistribution.merkle_root}`);
    console.log(`📊 [DebugMerkleRoot] Distribution ID: ${activeDistribution.distribution_id}`);
    console.log(`📊 [DebugMerkleRoot] Created at: ${activeDistribution.created_at}`);
    
    // 2. Get current Merkle root from smart contract
    const rpcUrl = process.env.RPC_URL || chains.bsc.rpcUrls[0];
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, provider);
    
    let contractRoot: string;
    try {
      contractRoot = await (contract as any).merkleRoot();
      console.log(`📊 [DebugMerkleRoot] Contract Merkle Root: ${contractRoot}`);
    } catch (error) {
      console.error('❌ [DebugMerkleRoot] Failed to get Merkle root from contract:', error);
      return;
    }
    
    // 3. Compare the roots
    if (activeDistribution.merkle_root === contractRoot) {
      console.log('✅ [DebugMerkleRoot] Merkle roots match! The issue might be elsewhere.');
    } else {
      console.log('❌ [DebugMerkleRoot] Merkle roots DO NOT match! This is the problem.');
      console.log(`   Database: ${activeDistribution.merkle_root}`);
      console.log(`   Contract: ${contractRoot}`);
      
      // 4. Regenerate Merkle tree
      console.log('🔄 [DebugMerkleRoot] Regenerating Merkle tree...');
      try {
        const result = await generateMerkleTree();
        console.log('✅ [DebugMerkleRoot] Merkle tree regenerated successfully!');
        console.log(`   New Merkle Root: ${result.merkleRoot}`);
      } catch (error) {
        console.error('❌ [DebugMerkleRoot] Failed to regenerate Merkle tree:', error);
      }
    }
    
    // 5. Check specific user's proof
    const userAddress = '0x41347A026E28f532Ca464bd4FfFa451bF1aA5307';
    console.log(`🔍 [DebugMerkleRoot] Checking proof for user: ${userAddress}`);
    
    // Get user from database
    const userResult = await pool.query('SELECT user_id, wallet_address FROM "user" WHERE LOWER(wallet_address) = LOWER($1)', [userAddress]);
    if (userResult.rows.length === 0) {
      console.log('❌ [DebugMerkleRoot] User not found in database');
      return;
    }
    
    const user = userResult.rows[0];
    console.log(`📊 [DebugMerkleRoot] User ID: ${user.user_id}`);
    
    // Get user's proof
    const proofResult = await pool.query(
      'SELECT * FROM merkle_proof WHERE distribution_id = $1 AND user_id = $2',
      [activeDistribution.distribution_id, user.user_id]
    );
    
    if (proofResult.rows.length === 0) {
      console.log('❌ [DebugMerkleRoot] No proof found for this user');
      return;
    }
    
    const proof = proofResult.rows[0];
    console.log(`📊 [DebugMerkleRoot] Proof found:`);
    console.log(`   Amount: ${proof.amount}`);
    console.log(`   Proof length: ${proof.proof.length}`);
    console.log(`   Proof: ${JSON.stringify(proof.proof, null, 2)}`);
    
  } catch (error) {
    console.error('❌ [DebugMerkleRoot] Error during debugging:', error);
  } finally {
    await pool.end();
  }
}

// Run the debug script
debugMerkleRoot().catch(console.error);