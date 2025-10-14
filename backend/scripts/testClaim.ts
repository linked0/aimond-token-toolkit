import { ethers } from 'ethers';
import { loyaltyPointAddress, loyaltyPointABI } from '../src/constants/contracts';
import { chains } from '../src/constants/chains';
import pool from '../src/database/db';
import { PgMerkleDistributionRepository } from '../src/repositories/pg/PgMerkleDistributionRepository';
import { PgMerkleProofRepository } from '../src/repositories/pg/PgMerkleProofRepository';
import { PgUserRepository } from '../src/repositories/pg/PgUserRepository';

const merkleDistributionRepository = new PgMerkleDistributionRepository(pool);
const merkleProofRepository = new PgMerkleProofRepository(pool);
const userRepository = new PgUserRepository(pool);

async function testClaim() {
  console.log('🧪 [TestClaim] Starting claim test...');
  
  try {
    const userAddress = '0x41347A026E28f532Ca464bd4FfFa451bF1aA5307';
    
    // Get user from database
    const user = await userRepository.findByWalletAddress(userAddress);
    if (!user) {
      console.log('❌ [TestClaim] User not found in database');
      return;
    }
    console.log('✅ [TestClaim] User found:', user);
    
    // Get active distribution
    const activeDistribution = await merkleDistributionRepository.findActive();
    if (!activeDistribution) {
      console.log('❌ [TestClaim] No active distribution found');
      return;
    }
    console.log('✅ [TestClaim] Active distribution found:', activeDistribution);
    
    // Get user's proof
    const merkleProof = await merkleProofRepository.findByDistributionAndUser(activeDistribution.distribution_id, user.user_id);
    if (!merkleProof) {
      console.log('❌ [TestClaim] No proof found for user');
      return;
    }
    console.log('✅ [TestClaim] Proof found:', merkleProof);
    
    // Test the claim with the correct proof
    const rpcUrl = process.env.RPC_URL || chains.bsc.rpcUrls[0];
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, provider);
    
    console.log('🧪 [TestClaim] Testing claim with:');
    console.log('  User:', userAddress);
    console.log('  Amount:', merkleProof.amount);
    console.log('  Proof length:', merkleProof.proof.length);
    console.log('  Proof:', merkleProof.proof);
    
    // Try to estimate gas
    try {
      const gasEstimate = await (contract as any).claimForUser.estimateGas(
        userAddress, 
        ethers.toBigInt(merkleProof.amount), 
        merkleProof.proof
      );
      console.log('✅ [TestClaim] Gas estimate successful:', gasEstimate.toString());
    } catch (error: any) {
      console.log('❌ [TestClaim] Gas estimation failed:', error.message);
      if (error.data) {
        console.log('❌ [TestClaim] Error data:', error.data);
      }
    }
    
  } catch (error) {
    console.error('❌ [TestClaim] Error during test:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testClaim().catch(console.error);