import { ethers } from 'ethers';
import { loyaltyPointAddress, loyaltyPointABI } from '../src/constants/contracts';
import { chains } from '../src/constants/chains';
import * as fs from 'fs';

async function testClaimDirect() {
  console.log('🧪 [TestClaimDirect] Testing claim directly...');
  
  try {
    const userAddress = '0x41347A026E28f532Ca464bd4FfFa451bF1aA5307';
    const amount = '1000000000000000000000';
    const proof = ['0xaa3535cba132f6e89284e1ebba8f71db7404711bd7bff3458381e16de2a26640'];
    
    // Load keystore and create wallet
    const keystorePath = './keystore/keystore-loyalty-point-admin.json';
    const keystoreJson = fs.readFileSync(keystorePath, 'utf8');
    const password = process.env.KEYSTORE_PASSWORD || 'QWER1234';
    
    const wallet = await ethers.Wallet.fromEncryptedJson(keystoreJson, password);
    console.log('Wallet address:', wallet.address);
    
    // Create provider and contract
    const rpcUrl = process.env.RPC_URL || chains.bsc.rpcUrls[0];
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const connectedWallet = wallet.connect(provider);
    const contract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, connectedWallet);
    
    console.log('Testing claim with:');
    console.log('  User:', userAddress);
    console.log('  Amount:', amount);
    console.log('  Proof:', proof);
    
    // Try different ways to call claimForUser
    console.log('\n🧪 Method 1: Direct call');
    try {
      const tx = await (contract as any).claimForUser(userAddress, ethers.toBigInt(amount), proof);
      console.log('✅ Direct call successful! Tx hash:', tx.hash);
    } catch (error: any) {
      console.log('❌ Direct call failed:', error.message);
    }
    
    console.log('\n🧪 Method 2: Using getFunction');
    try {
      const claimFunction = contract.getFunction('claimForUser');
      const tx = await claimFunction(userAddress, ethers.toBigInt(amount), proof);
      console.log('✅ getFunction call successful! Tx hash:', tx.hash);
    } catch (error: any) {
      console.log('❌ getFunction call failed:', error.message);
    }
    
    console.log('\n🧪 Method 3: Using populateTransaction');
    try {
      const txData = await (contract as any).populateTransaction.claimForUser(userAddress, ethers.toBigInt(amount), proof);
      console.log('✅ populateTransaction successful!');
      console.log('Tx data:', txData);
    } catch (error: any) {
      console.log('❌ populateTransaction failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ [TestClaimDirect] Error:', error);
  }
}

// Run the test
testClaimDirect().catch(console.error);