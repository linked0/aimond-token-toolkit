import { ethers } from 'ethers';
import { loyaltyPointAddress, loyaltyPointABI } from '../src/constants/contracts';
import { chains } from '../src/constants/chains';
import * as fs from 'fs';

async function debugContractMethods() {
  console.log('🔍 [DebugContractMethods] Checking contract methods...');
  
  try {
    // Create provider and contract
    const rpcUrl = process.env.RPC_URL || chains.bsc.rpcUrls[0];
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, provider);
    
    console.log('Contract address:', loyaltyPointAddress);
    console.log('Contract ABI length:', loyaltyPointABI.length);
    
    // Check what methods are available
    console.log('\n📋 Available methods on contract:');
    const methods = Object.getOwnPropertyNames(contract);
    methods.forEach(method => {
      if (typeof contract[method] === 'function') {
        console.log(`  - ${method}`);
      }
    });
    
    // Check if claimForUser exists
    console.log('\n🔍 Checking claimForUser method:');
    console.log('claimForUser exists:', 'claimForUser' in contract);
    console.log('claimForUser type:', typeof contract.claimForUser);
    
    // Try to call merkleRoot (should work)
    try {
      const root = await (contract as any).merkleRoot();
      console.log('✅ merkleRoot() works:', root);
    } catch (error) {
      console.log('❌ merkleRoot() failed:', error);
    }
    
    // Try to call claimForUser with dummy data
    try {
      console.log('\n🧪 Testing claimForUser with dummy data...');
      const dummyTx = await (contract as any).claimForUser(
        '0x0000000000000000000000000000000000000000',
        '0',
        []
      );
      console.log('✅ claimForUser() method exists and callable');
    } catch (error: any) {
      console.log('❌ claimForUser() failed:', error.message);
      if (error.code) {
        console.log('Error code:', error.code);
      }
    }
    
    // Check the ABI for claimForUser
    console.log('\n📋 ABI entries for claimForUser:');
    const claimForUserABI = loyaltyPointABI.filter((item: any) => 
      item.name === 'claimForUser' || item.name === 'claim'
    );
    console.log('Found ABI entries:', claimForUserABI);
    
  } catch (error) {
    console.error('❌ [DebugContractMethods] Error:', error);
  }
}

// Run the debug
debugContractMethods().catch(console.error);