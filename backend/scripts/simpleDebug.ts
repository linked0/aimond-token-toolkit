import { ethers } from 'ethers';
import { loyaltyPointAddress, loyaltyPointABI } from '../src/constants/contracts';
import { chains } from '../src/constants/chains';

async function simpleDebug() {
  console.log('🔍 [SimpleDebug] Starting simple debugging...');
  
  try {
    // 1. Get current Merkle root from smart contract
    const rpcUrl = process.env.RPC_URL || chains.bsc.rpcUrls[0];
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, provider);
    
    const contractRoot = await (contract as any).merkleRoot();
    console.log(`📊 [SimpleDebug] Contract Merkle Root: ${contractRoot}`);
    
    // 2. Check the specific user's claim attempt
    const userAddress = '0x41347A026E28f532Ca464bd4FfFa451bF1aA5307';
    const amount = '1000000000000000000000'; // 1000 tokens
    
    console.log(`🔍 [SimpleDebug] User: ${userAddress}`);
    console.log(`🔍 [SimpleDebug] Amount: ${amount}`);
    
    // 3. Try to estimate gas for the claim
    try {
      const gasEstimate = await (contract as any).estimateGas.claimForUser(userAddress, amount, []);
      console.log(`📊 [SimpleDebug] Gas estimate: ${gasEstimate.toString()}`);
    } catch (error: any) {
      console.log(`❌ [SimpleDebug] Gas estimation failed: ${error.message}`);
      if (error.data) {
        console.log(`❌ [SimpleDebug] Error data: ${error.data}`);
      }
    }
    
  } catch (error) {
    console.error('❌ [SimpleDebug] Error during debugging:', error);
  }
}

// Run the debug script
simpleDebug().catch(console.error);