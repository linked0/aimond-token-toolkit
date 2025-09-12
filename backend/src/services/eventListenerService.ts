import { ethers } from 'ethers';
import { loyaltyPointAddress, loyaltyPointABI } from '../constants/contracts';
import { chains } from '../constants/chains';
import { PgUserRepository } from '../repositories/pg/PgUserRepository';
import { PgAllocationRepository } from '../repositories/pg/PgAllocationRepository';
import { PgClaimRepository } from '../repositories/pg/PgClaimRepository';
import pool from '../database/db';

const userRepository = new PgUserRepository(pool);
const allocationRepository = new PgAllocationRepository(pool);
const claimRepository = new PgClaimRepository(pool);

export function startClaimedEventListener() {
  console.log('[EventListenerService] Starting event listener for Claimed events...');

  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || chains.bscTestnet.rpcUrls[0]);
  const contract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, provider);

  contract.on('Claimed', async (user, amount, event) => {
    console.log(`[EventListenerService] Claimed event received for user: ${user}, amount: ${amount.toString()}`);

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

      console.log(`[EventListenerService] Successfully processed claim for user ${user}.`);

    } catch (error) {
      console.error(`[EventListenerService] Error processing Claimed event for user ${user}:`, error);
    }
  });

  provider.on('error', (error) => {
    console.error('[EventListenerService] Provider error:', error);
    // You might want to add some reconnection logic here
  });

  console.log('[EventListenerService] Event listener started.');
}
