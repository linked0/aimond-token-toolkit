import pool from '../src/database/db';
import { PgMerkleDistributionRepository } from '../src/repositories/pg/PgMerkleDistributionRepository';
import { PgMerkleProofRepository } from '../src/repositories/pg/PgMerkleProofRepository';
import { PgUserRepository } from '../src/repositories/pg/PgUserRepository';

const merkleDistributionRepository = new PgMerkleDistributionRepository(pool);
const merkleProofRepository = new PgMerkleProofRepository(pool);
const userRepository = new PgUserRepository(pool);

async function debugCurrentDistribution() {
  console.log('🔍 [DebugCurrentDistribution] Analyzing current distribution...');
  
  try {
    // Get active distribution
    const activeDistribution = await merkleDistributionRepository.findActive();
    if (!activeDistribution) {
      console.log('❌ No active distribution found');
      return;
    }
    
    console.log(`✅ Active distribution: ${activeDistribution.distribution_id}`);
    console.log(`   Merkle root: ${activeDistribution.merkle_root}`);
    console.log(`   Created at: ${activeDistribution.created_at}`);
    
    // Get all proofs for this distribution
    const proofs = await pool.query(
      'SELECT mp.*, u.wallet_address FROM merkle_proof mp JOIN "user" u ON mp.user_id = u.user_id WHERE mp.distribution_id = $1 ORDER BY mp.user_id',
      [activeDistribution.distribution_id]
    );
    
    console.log(`\n📊 Found ${proofs.rows.length} proofs in this distribution:`);
    
    for (const proof of proofs.rows) {
      console.log(`\nUser ID: ${proof.user_id}`);
      console.log(`Wallet: ${proof.wallet_address}`);
      console.log(`Amount: ${proof.amount}`);
      console.log(`Proof length: ${proof.proof.length}`);
      console.log(`Proof: ${JSON.stringify(proof.proof, null, 2)}`);
    }
    
    // Check if the specific user we're testing is in this distribution
    const testUserAddress = '0x41347A026E28f532Ca464bd4FfFa451bF1aA5307';
    const testUserProof = proofs.rows.find(p => p.wallet_address.toLowerCase() === testUserAddress.toLowerCase());
    
    if (testUserProof) {
      console.log(`\n✅ Test user found in distribution:`);
      console.log(`   User ID: ${testUserProof.user_id}`);
      console.log(`   Amount: ${testUserProof.amount}`);
      console.log(`   Proof: ${JSON.stringify(testUserProof.proof, null, 2)}`);
    } else {
      console.log(`\n❌ Test user NOT found in current distribution`);
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await pool.end();
  }
}

// Run the debug script
debugCurrentDistribution().catch(console.error);