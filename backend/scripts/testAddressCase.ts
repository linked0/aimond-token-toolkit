import { ethers } from 'ethers';
import { loyaltyPointAddress, loyaltyPointABI } from '../src/constants/contracts';
import { chains } from '../src/constants/chains';

async function testAddressCase() {
  console.log('🔍 [TestAddressCase] Testing address case sensitivity...');
  
  const userAddress = '0x41347A026E28f532Ca464bd4FfFa451bF1aA5307';
  const amount = '1000000000000000000000';
  const proof = [
    '0xaa3535cba132f6e89284e1ebba8f71db7404711bd7bff3458381e16de2a26640',
    '0x7a7628f6fe65242bcb2a09606584b61c3e4e825e83642f8908ee48024b01e7cc'
  ];
  
  console.log(`Original address: ${userAddress}`);
  console.log(`Checksum address: ${ethers.getAddress(userAddress)}`);
  console.log(`Addresses match: ${userAddress === ethers.getAddress(userAddress)}`);
  
  // Connect to contract
  const rpcUrl = process.env.RPC_URL || chains.bsc.rpcUrls[0];
  const provider = new ethers.JsonRpcProvider(rpcUrl);
  const contract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, provider);
  
  // Test with original address
  console.log(`\n🧪 Testing with original address: ${userAddress}`);
  try {
    const gasEstimate = await (contract as any).claimForUser.estimateGas(
      userAddress, 
      ethers.toBigInt(amount), 
      proof
    );
    console.log('✅ Gas estimate successful with original address');
  } catch (error: any) {
    console.log('❌ Gas estimation failed with original address:', error.message);
    if (error.data) {
      console.log('❌ Error data:', error.data);
    }
  }
  
  // Test with checksum address
  const checksumAddress = ethers.getAddress(userAddress);
  console.log(`\n🧪 Testing with checksum address: ${checksumAddress}`);
  try {
    const gasEstimate = await (contract as any).claimForUser.estimateGas(
      checksumAddress, 
      ethers.toBigInt(amount), 
      proof
    );
    console.log('✅ Gas estimate successful with checksum address');
  } catch (error: any) {
    console.log('❌ Gas estimation failed with checksum address:', error.message);
    if (error.data) {
      console.log('❌ Error data:', error.data);
    }
  }
  
  // Test with lowercase address
  const lowercaseAddress = userAddress.toLowerCase();
  console.log(`\n🧪 Testing with lowercase address: ${lowercaseAddress}`);
  try {
    const gasEstimate = await (contract as any).claimForUser.estimateGas(
      lowercaseAddress, 
      ethers.toBigInt(amount), 
      proof
    );
    console.log('✅ Gas estimate successful with lowercase address');
  } catch (error: any) {
    console.log('❌ Gas estimation failed with lowercase address:', error.message);
    if (error.data) {
      console.log('❌ Error data:', error.data);
    }
  }
}

// Run the test
testAddressCase().catch(console.error);