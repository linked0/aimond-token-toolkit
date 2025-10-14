import { ethers, WebSocketProvider } from 'ethers';
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
  console.log('[EventListenerService] Starting WebSocket event listener for Claimed events...');

  let provider: WebSocketProvider;
  let contract: ethers.Contract;
  let isConnected = false;
  let reconnectTimeout: NodeJS.Timeout | null = null;
  let lastProcessedBlock = 0;
  let lastHealthUpdate = Date.now();

  const WS_URL = process.env.WS_RPC_URL || 'wss://bsc-ws-node.nariox.org:443/ws';
  
  // Note: In ethers v6, we use contract.on() directly instead of raw topic filtering

  const connect = async () => {
    try {
      console.log('[EventListenerService] Connecting to WebSocket provider...');
      
      // Create WebSocket provider
      provider = new WebSocketProvider(WS_URL);
      contract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, provider);

      // Handle connection events - in ethers v6, we need to check connection status differently
      provider.on('error', (error) => {
        console.error('[EventListenerService] WebSocket error:', error);
        isConnected = false;
        if (typeof global !== 'undefined') {
          (global as any).isWebSocketHealthy = false;
        }
        scheduleReconnect();
      });

      // Note: 'close' event is not supported in ethers v6 WebSocket provider
      // We'll monitor connection health through periodic checks instead

      // Test connection by getting block number
      try {
        const blockNumber = await provider.getBlockNumber();
        console.log('[EventListenerService] ✅ WebSocket connected successfully');
        isConnected = true;
        lastProcessedBlock = blockNumber;
        lastHealthUpdate = Date.now();
        console.log(`[EventListenerService] Starting from block: ${blockNumber}`);
        
        // Update global health status
        if (typeof global !== 'undefined') {
          (global as any).isWebSocketHealthy = true;
        }
      } catch (error) {
        console.error('[EventListenerService] Failed to get block number:', error);
        isConnected = false;
        if (typeof global !== 'undefined') {
          (global as any).isWebSocketHealthy = false;
        }
        scheduleReconnect();
        return;
      }

      // Listen for Claimed events using the contract's event listener
      contract.on('Claimed', async (user, amount, event) => {
        try {
          console.log(`🎉 [EventListenerService] ⭐ CLAIMED EVENT ⭐ received:`, event);
          console.log(`🎉 [EventListenerService] ⭐ CLAIMED EVENT ⭐ received for user: ${user}, amount: ${amount.toString()} 🎉`);

          const dbUser = await userRepository.findByWalletAddress(user);
          if (!dbUser) {
            console.warn(`[EventListenerService] User with address ${user} not found in the database.`);
            return;
          }

          const currentTotalClaimedAmount = await claimRepository.getTotalClaimedAmountByUserId(dbUser.user_id);

          // 1. Create a new claim record
          const newClaim = await claimRepository.create({
            user_id: dbUser.user_id,
            amount: ethers.formatUnits(amount, 18),
            total_claimed_amount: (currentTotalClaimedAmount + parseFloat(ethers.formatUnits(amount, 18))).toString(),
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
          console.error(`❌ [EventListenerService] ❌ Error processing CLAIMED EVENT:`, error);
        }
      });

    } catch (error) {
      console.error('[EventListenerService] Failed to connect to WebSocket:', error);
      scheduleReconnect();
    }
  };

  const scheduleReconnect = () => {
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    
    console.log('[EventListenerService] Scheduling reconnection in 5 seconds...');
    reconnectTimeout = setTimeout(() => {
      console.log('[EventListenerService] Attempting to reconnect...');
      connect().catch(console.error);
    }, 5000);
  };

  const disconnect = () => {
    if (provider) {
      console.log('[EventListenerService] Disconnecting WebSocket...');
      provider.destroy();
    }
    if (reconnectTimeout) {
      clearTimeout(reconnectTimeout);
    }
    if (healthCheckInterval) {
      clearInterval(healthCheckInterval);
    }
    isConnected = false;
    if (typeof global !== 'undefined') {
      (global as any).isWebSocketHealthy = false;
    }
  };

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('[EventListenerService] Received SIGINT, shutting down gracefully...');
    disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    console.log('[EventListenerService] Received SIGTERM, shutting down gracefully...');
    disconnect();
    process.exit(0);
  });

  // Start the connection
  connect().catch(console.error);

  // Health check every 30 seconds
  const healthCheckInterval = setInterval(async () => {
    if (!isConnected) {
      console.log('[EventListenerService] Health check: Not connected, attempting to reconnect...');
      connect().catch(console.error);
    } else {
      // Test connection by trying to get block number
      try {
        await provider.getBlockNumber();
        lastHealthUpdate = Date.now();
        if (typeof global !== 'undefined') {
          (global as any).isWebSocketHealthy = true;
        }
      } catch (error) {
        console.log('[EventListenerService] Health check failed, connection appears down');
        isConnected = false;
        if (typeof global !== 'undefined') {
          (global as any).isWebSocketHealthy = false;
        }
        scheduleReconnect();
      }
    }
  }, 30000);

  // Return disconnect function for cleanup if needed
  return { disconnect };
}
