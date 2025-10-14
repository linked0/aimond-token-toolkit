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

async function testOtherUsers() {
  console.log('🔍 [TestOtherUsers] Testing other users...');
  
  try {
    // Get active distribution
    const activeDistribution = await merkleDistributionRepository.findActive();
    if (!activeDistribution) {
      console.log('❌ No active distribution found');
      return;
    }
    
    // Get all proofs for this distribution
    const proofs = await pool.query(
      'SELECT mp.*, u.wallet_address FROM merkle_proof mp JOIN "user" u ON mp.user_id = u.user_id WHERE mp.distribution_id = $1 ORDER BY mp.user_id',
      [activeDistribution.distribution_id]
    );
    
    console.log(`📊 Found ${proofs.rows.length} users to test`);
    
    // Connect to contract
    const rpcUrl = process.env.RPC_URL || chains.bsc.rpcUrls[0];
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, provider);
    
    // Test each user
    for (const proof of proofs.rows) {
      console.log(`\n🧪 Testing User ID: ${proof.user_id}`);
      console.log(`   Wallet: ${proof.wallet_address}`);
      console.log(`   Amount: ${proof.amount}`);
      
      try {
        const gasEstimate = await (contract as any).claimForUser.estimateGas(
          proof.wallet_address, 
          ethers.toBigInt(proof.amount), 
          proof.proof
        );
        console.log(`   ✅ Gas estimate successful: ${gasEstimate.toString()}`);
      } catch (error: any) {
        console.log(`   ❌ Gas estimation failed: ${error.message}`);
        if (error.data) {
          console.log(`   ❌ Error data: ${error.data}`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error during testing:', error);
  } finally {
    await pool.end();
  }
}

// Run the test
testOtherUsers().catch(console.error);