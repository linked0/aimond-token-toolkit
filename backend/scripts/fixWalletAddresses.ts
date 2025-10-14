import { Pool } from 'pg';
import { ethers } from 'ethers';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: parseInt(process.env.DB_PORT || '5432'),
});

async function fixWalletAddresses() {
  const client = await pool.connect();
  
  try {
    console.log('Starting wallet address cleanup...');
    
    // Get all users with potentially problematic wallet addresses
    const result = await client.query('SELECT user_id, wallet_address FROM "user" WHERE wallet_address LIKE \' %\' OR wallet_address LIKE \'% \'');
    
    console.log(`Found ${result.rows.length} users with whitespace issues`);
    
    for (const user of result.rows) {
      const originalAddress = user.wallet_address;
      const trimmedAddress = originalAddress.trim();
      
      // Validate the trimmed address
      if (ethers.isAddress(trimmedAddress)) {
        console.log(`Fixing user ${user.user_id}: "${originalAddress}" -> "${trimmedAddress}"`);
        
        // Check if the trimmed address already exists
        const existingUser = await client.query('SELECT user_id FROM "user" WHERE wallet_address = $1', [trimmedAddress]);
        
        if (existingUser.rows.length > 0) {
          const existingUserId = existingUser.rows[0].user_id;
          console.log(`⚠️ Trimmed address already exists for user ${existingUserId}, merging data from user ${user.user_id}`);
          
          // Transfer allocations from duplicate user to existing user
          await client.query('UPDATE allocation SET user_id = $1 WHERE user_id = $2', [existingUserId, user.user_id]);
          console.log(`📦 Transferred allocations from user ${user.user_id} to user ${existingUserId}`);
          
          // Transfer claims from duplicate user to existing user
          await client.query('UPDATE claim SET user_id = $1 WHERE user_id = $2', [existingUserId, user.user_id]);
          console.log(`💰 Transferred claims from user ${user.user_id} to user ${existingUserId}`);
          
          // Transfer merkle proofs from duplicate user to existing user
          await client.query('UPDATE merkle_proof SET user_id = $1 WHERE user_id = $2', [existingUserId, user.user_id]);
          console.log(`🔐 Transferred merkle proofs from user ${user.user_id} to user ${existingUserId}`);
          
          // Delete the duplicate user with whitespace
          await client.query('DELETE FROM "user" WHERE user_id = $1', [user.user_id]);
          console.log(`🗑️ Deleted duplicate user ${user.user_id}`);
        } else {
          // Update the user's wallet address
          await client.query('UPDATE "user" SET wallet_address = $1 WHERE user_id = $2', [trimmedAddress, user.user_id]);
          console.log(`✅ Fixed user ${user.user_id}`);
        }
      } else {
        console.error(`❌ Invalid address format for user ${user.user_id}: "${originalAddress}" (trimmed: "${trimmedAddress}")`);
      }
    }
    
    console.log('Wallet address cleanup completed!');
    
  } catch (error) {
    console.error('Error during wallet address cleanup:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

// Run the cleanup
fixWalletAddresses().catch(console.error);