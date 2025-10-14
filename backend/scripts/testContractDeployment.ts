import { ethers } from 'ethers';
import { loyaltyPointAddress, loyaltyPointABI } from '../src/constants/contracts';
import { chains } from '../src/constants/chains';

async function testContractDeployment() {
  console.log('🔍 [TestContractDeployment] Testing contract deployment...');
  
  try {
    const rpcUrl = process.env.RPC_URL || chains.bsc.rpcUrls[0];
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    
    console.log('RPC URL:', rpcUrl);
    console.log('Contract address:', loyaltyPointAddress);
    
    // Check if contract exists at the address
    const code = await provider.getCode(loyaltyPointAddress);
    console.log('Contract code length:', code.length);
    console.log('Contract deployed:', code !== '0x');
    
    if (code === '0x') {
      console.log('❌ No contract found at this address!');
      return;
    }
    
    // Create contract instance
    const contract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, provider);
    
    // Test basic contract functions
    try {
      const name = await (contract as any).name();
      console.log('Contract name:', name);
    } catch (error) {
      console.log('❌ Cannot read name:', error);
    }
    
    try {
      const symbol = await (contract as any).symbol();
      console.log('Contract symbol:', symbol);
    } catch (error) {
      console.log('❌ Cannot read symbol:', error);
    }
    
    try {
      const merkleRoot = await (contract as any).merkleRoot();
      console.log('✅ Merkle root:', merkleRoot);
    } catch (error) {
      console.log('❌ Cannot read merkleRoot:', error);
    }
    
    // Check if claimForUser method exists
    console.log('\n🔍 Checking claimForUser method:');
    console.log('claimForUser in contract:', 'claimForUser' in contract);
    console.log('claimForUser type:', typeof contract.claimForUser);
    
    // List all available methods
    console.log('\n📋 All contract methods:');
    const methods = Object.getOwnPropertyNames(contract);
    methods.forEach(method => {
      if (typeof contract[method] === 'function' && !method.startsWith('_')) {
        console.log(`  - ${method}`);
      }
    });
    
    // Check ABI functions
    console.log('\n📋 ABI functions:');
    loyaltyPointABI.forEach((item: any) => {
      if (item.type === 'function') {
        console.log(`  - ${item.name} (${item.stateMutability})`);
      }
    });
    
  } catch (error) {
    console.error('❌ [TestContractDeployment] Error:', error);
  }
}

// Run the test
testContractDeployment().catch(console.error);