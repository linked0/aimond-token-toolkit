import { ethers } from 'ethers';
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

export function startClaimedEventListener() {
  console.log('[EventListenerService] Starting event listener for Claimed events...');

  let provider: ethers.JsonRpcProvider;
  let contract: ethers.Contract;
  let isListening = false;

  // Global error handler for unhandled promise rejections
  const originalUnhandledRejection = process.listeners('unhandledRejection');
  process.on('unhandledRejection', (reason, promise) => {
    const errorMessage = reason?.toString() || '';
    if (errorMessage.includes('filter not found') || errorMessage.includes('eth_getFilterChanges')) {
      console.error('[EventListenerService] Unhandled filter error detected:', reason);
      recreateEventListener();
    } else {
      // Call original handlers if they exist
      originalUnhandledRejection.forEach(listener => {
        if (typeof listener === 'function') {
          listener(reason, promise);
        }
      });
    }
  });

  const setupEventListener = () => {
    try {
      provider = new ethers.JsonRpcProvider(process.env.RPC_URL || chains.bsc.rpcUrls[0]);
      contract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, provider);

      // Log provider connection
      provider.getNetwork().then(net => {
        console.log(
          `[EventListenerService] Connected to network: ${net.name} (chainId: ${net.chainId})`
        );
      }).catch(error => {
        console.error('[EventListenerService] Failed to get network info:', error);
      });

      contract.on('Claimed', async (user, amount, event) => {
        console.log(`🎉 [EventListenerService] ⭐ CLAIMED EVENT ⭐ received for user: ${user}, amount: ${amount.toString()} 🎉`);

        try {
          const dbUser = await userRepository.findByWalletAddress(user);
          if (!dbUser) {
            console.warn(`[EventListenerService] User with address ${user} not found in the database.`);
            return;
          }

          const currentTotalClaimedAmount = await claimRepository.getTotalClaimedAmountByUserId(dbUser.user_id);

          // 1. Create a new claim record
          const newClaim = await claimRepository.create({
            user_id: dbUser.user_id,
            amount: ethers.formatUnits(amount, 18), // The amount of tokens claimed in this specific claim
            total_claimed_amount: (currentTotalClaimedAmount + parseFloat(ethers.formatUnits(amount, 18))).toString(), // Calculate cumulative total
            transaction_hash: event.log.transactionHash,
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

          console.log(`✅ [EventListenerService] ✅ Successfully processed CLAIMED EVENT for user ${user} ✅`);

          // Emit SSE event to all connected clients
          if (global.claimedEventClients && global.claimedEventClients.length > 0) {
            const eventData = {
              type: 'claimed',
              user: user,
              amount: ethers.formatUnits(amount, 18),
              transactionHash: event.log.transactionHash,
              timestamp: new Date().toISOString()
            };
            
            const message = `data: ${JSON.stringify(eventData)}\n\n`;
            global.claimedEventClients.forEach(client => {
              try {
                client.write(message);
              } catch (error) {
                console.error('[EventListenerService] Error sending SSE event:', error);
              }
            });
          }

        } catch (error) {
          console.error(`❌ [EventListenerService] ❌ Error processing CLAIMED EVENT for user ${user}:`, error);
          
          // Check if this is a filter-related error that requires recreation
          const errorMessage = (error as Error).message || '';
          const isFilterError = errorMessage.includes('filter not found') || 
                              errorMessage.includes('eth_getFilterChanges');
          
          if (isFilterError) {
            console.log('[EventListenerService] Filter error detected in event processing, recreating listener...');
            recreateEventListener();
          }
        }
      });


      // Handle provider errors and filter expiration
      provider.on('error', (error) => {
        console.error('[EventListenerService] Provider error:', error);
        
        // Check if it's a filter not found error (check both message and error object)
        const isFilterNotFound = (error.message && error.message.includes('filter not found')) ||
                               (error.error && error.error.message && error.error.message.includes('filter not found'));
        
        if (isFilterNotFound) {
          console.log('[EventListenerService] Filter expired, attempting to recreate event listener...');
          recreateEventListener();
        }
      });

      // Handle contract event errors (including filter expiration)
      contract.on('error', (error) => {
        console.error('[EventListenerService] Contract event error:', error);
        
        // Check if it's a filter not found error
        const isFilterNotFound = (error.message && error.message.includes('filter not found')) ||
                               (error.error && error.error.message && error.error.message.includes('filter not found')) ||
                               (error.code === 'UNKNOWN_ERROR' && error.error && error.error.message === 'filter not found');
        
        if (isFilterNotFound) {
          console.log('[EventListenerService] Contract filter expired, attempting to recreate event listener...');
          recreateEventListener();
        }
      });

      isListening = true;
      console.log('[EventListenerService] Event listener started.');

    } catch (error) {
      console.error('[EventListenerService] Failed to setup event listener:', error);
      // Retry after 5 seconds
      setTimeout(() => {
        console.log('[EventListenerService] Retrying to setup event listener...');
        setupEventListener();
      }, 5000);
    }
  };

  const recreateEventListener = () => {
    if (isListening) {
      console.log('[EventListenerService] Recreating event listener...');
      
      // Remove existing listeners
      if (contract) {
        contract.removeAllListeners();
      }
      if (provider) {
        provider.removeAllListeners();
      }
      
      isListening = false;
      
      // Wait a bit before recreating
      setTimeout(() => {
        console.log('[EventListenerService] Attempting to recreate event listener after filter error...');
        setupEventListener();
      }, 2000);
    }
  };

  // Initial setup
  setupEventListener();

  // Periodic health check to recreate listener if needed
  setInterval(() => {
    if (!isListening) {
      console.log('[EventListenerService] Health check: Event listener not active, recreating...');
      setupEventListener();
    }
  }, 30000); // Check every 30 seconds
}
