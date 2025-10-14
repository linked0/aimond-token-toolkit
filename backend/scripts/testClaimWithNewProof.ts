import { ethers } from 'ethers';
import { loyaltyPointAddress, loyaltyPointABI } from '../src/constants/contracts';
import { chains } from '../src/constants/chains';
import * as fs from 'fs';

async function testClaimWithNewProof() {
  console.log('🧪 [TestClaimWithNewProof] Testing claim with new proof...');
  
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
    
    // Test gas estimation first
    console.log('\n🧪 Testing gas estimation...');
    try {
      const gasEstimate = await (contract as any).estimateGas.claimForUser(userAddress, ethers.toBigInt(amount), proof);
      console.log('✅ Gas estimation successful:', gasEstimate.toString());
      console.log('🎉 PROOF IS VALID! The claim should work.');
    } catch (error: any) {
      console.log('❌ Gas estimation failed:', error.message);
      if (error.data) {
        console.log('Error data:', error.data);
      }
    }
    
    // Test actual claim (commented out to avoid sending real transaction)
    /*
    console.log('\n🧪 Testing actual claim...');
    try {
      const tx = await (contract as any).claimForUser(userAddress, ethers.toBigInt(amount), proof);
      console.log('✅ Claim transaction sent! Tx hash:', tx.hash);
      const receipt = await tx.wait();
      console.log('✅ Claim confirmed! Receipt:', receipt.hash);
    } catch (error: any) {
      console.log('❌ Claim failed:', error.message);
    }
    */
    
  } catch (error) {
    console.error('❌ [TestClaimWithNewProof] Error:', error);
  }
}

// Run the test
testClaimWithNewProof().catch(console.error);