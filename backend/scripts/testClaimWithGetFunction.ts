import { ethers } from 'ethers';
import { loyaltyPointAddress, loyaltyPointABI } from '../src/constants/contracts';
import { chains } from '../src/constants/chains';
import * as fs from 'fs';

async function testClaimWithGetFunction() {
  console.log('🧪 [TestClaimWithGetFunction] Testing claim with getFunction...');
  
  try {
    const userAddress = '0x41347A026E28f532Ca464bd4FfFa451bF1aA5307';
    const amount = '1000000000000000000000';
    const proof = [
      "0xaa3535cba132f6e89284e1ebba8f71db7404711bd7bff3458381e16de2a26640",
      "0xa53fe3150df67ddcef55f3d73a4d704f87aa4c41d7305a73a088db92f7d6be14"
    ];
    
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
    console.log('  Proof length:', proof.length);
    console.log('  Proof:', proof);
    
    // Get the claimForUser function
    const claimFunction = contract.getFunction('claimForUser');
    console.log('Claim function type:', typeof claimFunction);
    
    // Test gas estimation
    console.log('\n🧪 Testing gas estimation...');
    try {
      const gasEstimate = await claimFunction.estimateGas(userAddress, ethers.toBigInt(amount), proof);
      console.log('✅ Gas estimation successful:', gasEstimate.toString());
      console.log('🎉 PROOF IS VALID! The claim should work.');
      
      // Test actual claim (commented out to avoid sending real transaction)
      /*
      console.log('\n🧪 Testing actual claim...');
      const tx = await claimFunction(userAddress, ethers.toBigInt(amount), proof);
      console.log('✅ Claim transaction sent! Tx hash:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Claim confirmed! Receipt:', receipt.hash);
      */
      
    } catch (error: any) {
      console.log('❌ Gas estimation failed:', error.message);
      if (error.data) {
        console.log('Error data:', error.data);
      }
      if (error.reason) {
        console.log('Error reason:', error.reason);
      }
    }
    
  } catch (error) {
    console.error('❌ [TestClaimWithGetFunction] Error:', error);
  }
}

// Run the test
testClaimWithGetFunction().catch(console.error);