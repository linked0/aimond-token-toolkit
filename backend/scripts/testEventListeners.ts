import { ethers } from 'ethers';
import { loyaltyPointAddress, loyaltyPointABI } from '../src/constants/contracts';
import { chains } from '../src/constants/chains';
import * as fs from 'fs';

async function testEventListeners() {
  console.log('🔍 [TestEventListeners] Testing event listeners...');
  
  try {
    // Test WebSocket connection
    console.log('\n🌐 Testing WebSocket connection...');
    const wsUrl = process.env.WS_RPC_URL || 'wss://bsc-ws-node.nariox.org:443/ws';
    console.log('WebSocket URL:', wsUrl);
    
    try {
      const wsProvider = new ethers.WebSocketProvider(wsUrl);
      const wsContract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, wsProvider);
      
      // Test connection
      const blockNumber = await wsProvider.getBlockNumber();
      console.log('✅ WebSocket connected! Current block:', blockNumber);
      
      // Test event listener
      console.log('Setting up Claimed event listener...');
      wsContract.on('Claimed', (user, amount, event) => {
        console.log('🎉 CLAIMED EVENT CAUGHT!');
        console.log('  User:', user);
        console.log('  Amount:', amount.toString());
        console.log('  Event:', event);
      });
      
      console.log('✅ WebSocket event listener set up successfully');
      console.log('Listening for Claimed events... (will wait 30 seconds)');
      
      // Wait for events
      setTimeout(() => {
        console.log('⏰ 30 seconds elapsed, stopping WebSocket test');
        wsProvider.destroy();
      }, 30000);
      
    } catch (error: any) {
      console.log('❌ WebSocket failed:', error.message);
    }
    
    // Test HTTP polling
    console.log('\n📡 Testing HTTP polling...');
    const rpcUrl = process.env.RPC_URL || chains.bsc.rpcUrls[0];
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const contract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, provider);
    
    try {
      const currentBlock = await provider.getBlockNumber();
      console.log('✅ HTTP provider connected! Current block:', currentBlock);
      
      // Test getting recent Claimed events
      const claimedTopic = ethers.id('Claimed(address,uint256)');
      const logs = await provider.getLogs({
        address: loyaltyPointAddress,
        topics: [claimedTopic],
        fromBlock: currentBlock - 100, // Last 100 blocks
        toBlock: currentBlock
      });
      
      console.log(`Found ${logs.length} Claimed events in last 100 blocks`);
      
      if (logs.length > 0) {
        console.log('Recent Claimed events:');
        for (const log of logs) {
          const parsedLog = contract.interface.parseLog({
            topics: log.topics,
            data: log.data
          });
          if (parsedLog && parsedLog.name === 'Claimed') {
            console.log(`  - User: ${parsedLog.args[0]}, Amount: ${parsedLog.args[1].toString()}`);
          }
        }
      }
      
    } catch (error: any) {
      console.log('❌ HTTP polling failed:', error.message);
    }
    
  } catch (error) {
    console.error('❌ [TestEventListeners] Error:', error);
  }
}

// Run the test
testEventListeners().catch(console.error);