import { ethers, JsonRpcProvider } from 'ethers';
import { loyaltyPointAddress, loyaltyPointABI } from '../constants/contracts';
import { chains } from '../constants/chains';
import { PgUserRepository } from '../repositories/pg/PgUserRepository';
import { PgAllocationRepository } from '../repositories/pg/PgAllocationRepository';
import { PgClaimRepository } from '../repositories/pg/PgClaimRepository';
import pool from '../database/db';
import express from 'express';

// Global type declaration for SSE clients
declare global {
  var claimedEventClients: express.Response[];
}

const userRepository = new PgUserRepository(pool);
const allocationRepository = new PgAllocationRepository(pool);
const claimRepository = new PgClaimRepository(pool);

export function startHttpEventPolling() {
  console.log('[HttpEventPolling] Starting HTTP-based event polling for Claimed events...');

  const provider = new JsonRpcProvider(process.env.RPC_URL || chains.bsc.rpcUrls[0], undefined, { 
    polling: true, 
    pollingInterval: 2000 // Poll every 2 seconds instead of 5
  });
  const contract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, provider);

  let lastProcessedBlock = 0;
  let isPolling = false;
  let lastHealthUpdate = Date.now();
  let catchUpMode = false;

  const processClaimedEvent = async (log: any) => {
    try {
      console.log(`🎉 [HttpEventPolling] ⭐ CLAIMED EVENT ⭐ received:`, log);
      
      // Parse the event data
      const parsedLog = contract.interface.parseLog({
        topics: log.topics,
        data: log.data
      });

      if (parsedLog && parsedLog.name === 'Claimed') {
        const user = parsedLog.args[0];
        const amount = parsedLog.args[1];

        console.log(`🎉 [HttpEventPolling] ⭐ CLAIMED EVENT ⭐ received for user: ${user}, amount: ${amount.toString()} 🎉`);

        const dbUser = await userRepository.findByWalletAddress(user);
        if (!dbUser) {
          console.warn(`[HttpEventPolling] User with address ${user} not found in the database.`);
          return;
        }

        const currentTotalClaimedAmount = await claimRepository.getTotalClaimedAmountByUserId(dbUser.user_id);

        // 1. Create a new claim record
        const newClaim = await claimRepository.create({
          user_id: dbUser.user_id,
          amount: ethers.formatUnits(amount, 18),
          total_claimed_amount: (currentTotalClaimedAmount + parseFloat(ethers.formatUnits(amount, 18))).toString(),
          transaction_hash: log.transactionHash,
          status: 'SUCCESS',
        });

        // 2. Find all unclaimed allocations for the user
        const unclaimedAllocations = await allocationRepository.findUnclaimedByUserId(dbUser.user_id);

        // 3. Update allocations
        for (const alloc of unclaimedAllocations) {
          await allocationRepository.update(alloc.allocation_id, {
            is_claimed: true,
            claim_id: newClaim.claim_id,
          });
        }

        console.log(`✅ [HttpEventPolling] ✅ Successfully processed CLAIMED EVENT for user ${user} ✅`);

        // Emit SSE event to all connected clients
        if (global.claimedEventClients && global.claimedEventClients.length > 0) {
          const eventData = {
            type: 'claimed',
            user: user,
            amount: ethers.formatUnits(amount, 18),
            transactionHash: log.transactionHash,
            timestamp: new Date().toISOString()
          };
          
          const message = `data: ${JSON.stringify(eventData)}\n\n`;
          global.claimedEventClients.forEach(client => {
            try {
              client.write(message);
            } catch (error) {
              console.error('[HttpEventPolling] Error sending SSE event:', error);
            }
          });
        }
      }
    } catch (error) {
      console.error(`❌ [HttpEventPolling] ❌ Error processing CLAIMED EVENT:`, error);
    }
  };

  const pollForEvents = async () => {
    if (isPolling) return;
    
    try {
      isPolling = true;
      lastHealthUpdate = Date.now();
      
      // Update global health status
      if (typeof global !== 'undefined') {
        (global as any).isHttpPollingHealthy = true;
      }
      
      const currentBlock = await provider.getBlockNumber();
      
      if (currentBlock > lastProcessedBlock) {
        const fromBlock = catchUpMode ? Math.max(lastProcessedBlock - 5, 0) : lastProcessedBlock + 1;
        console.log(`[HttpEventPolling] ${catchUpMode ? 'CATCH-UP' : 'Polling'} blocks ${fromBlock} to ${currentBlock}`);
        
        // Get Claimed events from the last processed block to current block
        const claimedTopic = ethers.id('Claimed(address,uint256)');
        const logs = await provider.getLogs({
          address: loyaltyPointAddress,
          topics: [claimedTopic],
          fromBlock: fromBlock,
          toBlock: currentBlock
        });

        console.log(`[HttpEventPolling] Found ${logs.length} Claimed events`);
        
        // Process each event
        for (const log of logs) {
          await processClaimedEvent(log);
        }
        
        lastProcessedBlock = currentBlock;
        catchUpMode = false; // Exit catch-up mode after successful poll
      }
    } catch (error) {
      console.error('[HttpEventPolling] Error during polling:', error);
      if (typeof global !== 'undefined') {
        (global as any).isHttpPollingHealthy = false;
      }
    } finally {
      isPolling = false;
    }
  };

  // Catch-up verification function
  const runCatchUpVerification = async () => {
    console.log('[HttpEventPolling] Running catch-up verification...');
    catchUpMode = true;
    await pollForEvents();
  };

  // Initialize last processed block
  const initialize = async () => {
    try {
      lastProcessedBlock = await provider.getBlockNumber();
      console.log(`[HttpEventPolling] Starting from block: ${lastProcessedBlock}`);
    } catch (error) {
      console.error('[HttpEventPolling] Failed to get initial block number:', error);
      lastProcessedBlock = 0;
    }
  };

  // Start polling
  initialize().then(() => {
    // Poll every 5 seconds
    setInterval(pollForEvents, 5000);
    console.log('[HttpEventPolling] HTTP event polling started');
  });

  return {
    stop: () => {
      console.log('[HttpEventPolling] Stopping HTTP event polling');
      isPolling = false;
    },
    runCatchUp: runCatchUpVerification,
    isHealthy: () => {
      const now = Date.now();
      return (now - lastHealthUpdate) < 30000; // Healthy if updated within 30 seconds
    }
  };
}