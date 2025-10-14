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

async function debugContractError() {
  console.log('🔍 [DebugContractError] Debugging contract error...');
  
  try {
    const userAddress = '0x41347A026E28f532Ca464bd4FfFa451bF1aA5307';
    
    // Get user from database
    const user = await userRepository.findByWalletAddress(userAddress);
    if (!user) {
      console.log('❌ User not found in database');
      return;
    }
    
    // Get active distribution
    const activeDistribution = await merkleDistributionRepository.findActive();
    if (!activeDistribution) {
      console.log('❌ No active distribution found');
      return;
    }
    
    // Get user's proof
    const merkleProof = await merkleProofRepository.findByDistributionAndUser(activeDistribution.distribution_id, user.user_id);
    if (!merkleProof) {
      console.log('❌ No proof found for user');
      return;
    }
    
    // Connect to contract
    const rpcUrl = process.env.RPC_URL || chains.bsc.rpcUrls[0];
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, provider);
    
    console.log(`\n📊 Contract Information:`);
    console.log(`Contract address: ${loyaltyPointAddress}`);
    console.log(`RPC URL: ${rpcUrl}`);
    
    // Check Merkle root
    try {
      const contractRoot = await (contract as any).merkleRoot();
      console.log(`Contract Merkle root: ${contractRoot}`);
      console.log(`Database Merkle root: ${activeDistribution.merkle_root}`);
      console.log(`Roots match: ${contractRoot === activeDistribution.merkle_root}`);
    } catch (error) {
      console.log('❌ Failed to get Merkle root from contract:', error);
    }
    
    // Check if user has already claimed
    try {
      const claimedAmount = await (contract as any).claimed(userAddress);
      console.log(`\n📊 Claim status:`);
      console.log(`User has claimed: ${claimedAmount.toString()}`);
      console.log(`Expected amount: ${merkleProof.amount}`);
      console.log(`Already claimed: ${claimedAmount > 0n}`);
    } catch (error) {
      console.log('❌ Failed to check claim status:', error);
    }
    
    // Check token balance of contract
    try {
      const tokenAddress = await (contract as any).amdToken();
      console.log(`\n📊 Token Information:`);
      console.log(`Token address: ${tokenAddress}`);
      
      // Create a simple ERC20 ABI for balance check
      const erc20ABI = [
        {
          "inputs": [{"internalType": "address", "name": "account", "type": "address"}],
          "name": "balanceOf",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        }
      ];
      
      const tokenContract = new ethers.Contract(tokenAddress, erc20ABI, provider);
      const contractBalance = await (tokenContract as any).balanceOf(loyaltyPointAddress);
      console.log(`Contract token balance: ${contractBalance.toString()}`);
      console.log(`Sufficient balance: ${contractBalance >= ethers.toBigInt(merkleProof.amount)}`);
    } catch (error) {
      console.log('❌ Failed to check token balance:', error);
    }
    
    // Try to decode the error
    console.log(`\n🔍 Error Analysis:`);
    const errorData = '0xe2517d3f0000000000000000000000000000000000000000000000000000000000000000a49807205ce4d355092ef5a8a18f56e8913cf4a201fbe287825b095693c21775';
    console.log(`Error data: ${errorData}`);
    console.log(`Error selector: ${errorData.slice(0, 10)}`);
    
    // Try to decode as different error types
    try {
      // Try to decode as a simple error with address and uint256
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['address', 'uint256'], '0x' + errorData.slice(10));
      console.log(`Decoded error (address, uint256):`, decoded);
    } catch (error) {
      console.log('❌ Failed to decode error as (address, uint256):', error);
    }
    
    try {
      // Try to decode as a simple error with uint256 and address
      const decoded = ethers.AbiCoder.defaultAbiCoder().decode(['uint256', 'address'], '0x' + errorData.slice(10));
      console.log(`Decoded error (uint256, address):`, decoded);
    } catch (error) {
      console.log('❌ Failed to decode error as (uint256, address):', error);
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await pool.end();
  }
}

// Run the debug script
debugContractError().catch(console.error);