import { ethers } from 'ethers';
import { loyaltyPointAddress, loyaltyPointABI } from '../src/constants/contracts';
import { chains } from '../src/constants/chains';
import * as fs from 'fs';

async function checkWalletRole() {
  console.log('🔍 [CheckWalletRole] Checking wallet roles...');
  
  try {
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
    
    // Check if wallet has ADMIN_ROLE
    const ADMIN_ROLE = ethers.keccak256(ethers.toUtf8Bytes("ADMIN_ROLE"));
    console.log('ADMIN_ROLE hash:', ADMIN_ROLE);
    
    try {
      const hasAdminRole = await (contract as any).hasRole(ADMIN_ROLE, wallet.address);
      console.log('Has ADMIN_ROLE:', hasAdminRole);
    } catch (error) {
      console.log('❌ Failed to check ADMIN_ROLE:', error);
    }
    
    // Check if wallet has DEFAULT_ADMIN_ROLE
    const DEFAULT_ADMIN_ROLE = ethers.ZeroHash; // DEFAULT_ADMIN_ROLE is 0x00
    console.log('DEFAULT_ADMIN_ROLE hash:', DEFAULT_ADMIN_ROLE);
    
    try {
      const hasDefaultAdminRole = await (contract as any).hasRole(DEFAULT_ADMIN_ROLE, wallet.address);
      console.log('Has DEFAULT_ADMIN_ROLE:', hasDefaultAdminRole);
    } catch (error) {
      console.log('❌ Failed to check DEFAULT_ADMIN_ROLE:', error);
    }
    
    // Try to call a simple read function
    try {
      const merkleRoot = await (contract as any).merkleRoot();
      console.log('✅ Can read merkleRoot:', merkleRoot);
    } catch (error) {
      console.log('❌ Cannot read merkleRoot:', error);
    }
    
    // Try to call claimForUser with a test transaction (estimate gas only)
    try {
      console.log('\n🧪 Testing claimForUser with gas estimation...');
      const gasEstimate = await (contract as any).estimateGas.claimForUser(
        '0x0000000000000000000000000000000000000000',
        '0',
        []
      );
      console.log('✅ claimForUser gas estimation successful:', gasEstimate.toString());
    } catch (error: any) {
      console.log('❌ claimForUser gas estimation failed:', error.message);
      if (error.code) {
        console.log('Error code:', error.code);
      }
    }
    
  } catch (error) {
    console.error('❌ [CheckWalletRole] Error:', error);
  }
}

// Run the check
checkWalletRole().catch(console.error);