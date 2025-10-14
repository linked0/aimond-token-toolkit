import { ethers } from 'ethers';
import { MerkleTree } from 'merkletreejs';
import keccak256 from 'keccak256';
import pool from '../src/database/db';
import { PgAllocationRepository } from '../src/repositories/pg/PgAllocationRepository';
import { PgUserRepository } from '../src/repositories/pg/PgUserRepository';

const userRepository = new PgUserRepository(pool);
const allocationRepository = new PgAllocationRepository(pool);

async function debugMerkleTreeService() {
  console.log('🔍 [DebugMerkleTreeService] Debugging Merkle tree service data...');
  
  try {
    const userAddress = '0x41347A026E28f532Ca464bd4FfFa451bF1aA5307';
    
    // Get user from database
    const user = await userRepository.findByWalletAddress(userAddress);
    if (!user) {
      console.log('❌ User not found in database');
      return;
    }
    console.log(`✅ User found:`, user);
    
    // Get unclaimed allocations for this user
    const unclaimedAllocations = await allocationRepository.findUnclaimed();
    const userAllocations = unclaimedAllocations.filter(alloc => alloc.user_id === user.user_id);
    
    console.log(`\n📊 Unclaimed allocations for user:`, userAllocations);
    
    // Calculate cumulative amount like in the service
    let cumulativeAmount = ethers.toBigInt(0);
    for (const alloc of userAllocations) {
      const newAmount = cumulativeAmount + ethers.parseUnits(alloc.amount, 18);
      cumulativeAmount = newAmount;
      console.log(`Allocation ${alloc.allocation_id}: ${alloc.amount} -> cumulative: ${cumulativeAmount.toString()}`);
    }
    
    console.log(`\nFinal cumulative amount: ${cumulativeAmount.toString()}`);
    
    // Test leaf generation with the actual data
    const trimmedAddress = user.wallet_address.trim();
    console.log(`Trimmed address: "${trimmedAddress}"`);
    console.log(`Address is valid: ${ethers.isAddress(trimmedAddress)}`);
    
    // Generate leaf using the same method as in the service
    const leaf = ethers.solidityPackedKeccak256(['address', 'uint256'], [trimmedAddress, cumulativeAmount]);
    console.log(`Generated leaf: ${leaf}`);
    
    // Compare with what we expect
    const expectedLeaf = ethers.solidityPackedKeccak256(['address', 'uint256'], [userAddress, '1000000000000000000000']);
    console.log(`Expected leaf: ${expectedLeaf}`);
    console.log(`Leaves match: ${leaf === expectedLeaf}`);
    
    // Check if the amount in the database matches what we calculated
    console.log(`\nAmount comparison:`);
    console.log(`Calculated amount: ${cumulativeAmount.toString()}`);
    console.log(`Expected amount: 1000000000000000000000`);
    console.log(`Amounts match: ${cumulativeAmount.toString() === '1000000000000000000000'}`);
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await pool.end();
  }
}

// Run the debug script
debugMerkleTreeService().catch(console.error);