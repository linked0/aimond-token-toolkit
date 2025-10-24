import express from 'express';
import { BaseContract, ContractTransactionResponse, ethers } from "ethers";
import * as fs from 'fs';
import { loyaltyPointAddress, loyaltyPointABI } from '../constants/contracts';
import { chains } from '../constants/chains';
import { PgUserRepository } from '../repositories/pg/PgUserRepository';
import { PgAllocationRepository } from '../repositories/pg/PgAllocationRepository';
import { PgMerkleDistributionRepository } from '../repositories/pg/PgMerkleDistributionRepository';
import { PgMerkleProofRepository } from '../repositories/pg/PgMerkleProofRepository';
import { PgClaimRepository } from '../repositories/pg/PgClaimRepository';
import pool from '../database/db'; // Import the pool from db.ts
import { generateMerkleTree } from '../services/merkleTreeService';
import { checkKeystorePassword } from '../utils/authUtils';

// Define an interface with ONLY your contract's functions
export interface LoyaltyPointContractMethods {
  claimForUser(
    userAddress: string,
    amount: string | bigint,
    proof: string[]
  ): Promise<ContractTransactionResponse>;
  merkleRoot(): Promise<string>;
  updateRoot(_root: string): Promise<ContractTransactionResponse>;
}

// Combine your methods with the base contract type
export type LoyaltyPointContract = BaseContract & LoyaltyPointContractMethods;

// Combine your methods with the base contract type
const router = express.Router();

const userRepository = new PgUserRepository(pool);
const allocationRepository = new PgAllocationRepository(pool);
const merkleDistributionRepository = new PgMerkleDistributionRepository(pool);
const merkleProofRepository = new PgMerkleProofRepository(pool);
const claimRepository = new PgClaimRepository(pool);

const PAID_MEMBER_THRESHOLD = 9.5; // $9.5 threshold for a paid new member
const AMD_ALLOCATION_RATE = 1000; // 1000 AMD per $1
const MAX_SPENDING_FOR_AMD = 5000000; // $5,000,000 cap

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management and loyalty points
 */

/**
 * @swagger
 * /api/points:
 *   get:
 *     summary: Get all users' loyalty points and allocation status.
 *     tags: [Users]
 *     responses:
 *       200:
 *         description: A list of users with their loyalty point breakdown and allocation status.
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   address:
 *                     type: string
 *                     description: The wallet address of the user.
 *                     example: "0xC4f9004d8348E9d43c5c080ab0592Fc70c61657f"
 *                   referralAmount:
 *                     type: string
 *                     description: Total amount from referral rewards.
 *                     example: "14000"
 *                   paidPointAmount:
 *                     type: string
 *                     description: Total amount from spending rewards.
 *                     example: "1000"
 *                   airdropAmount:
 *                     type: string
 *                     description: Total amount from airdrop allocations.
 *                     example: "100000"
 *                   status:
 *                     type: string
 *                     description: Status of allocations (e.g., "Unclaimed", "All Claimed").
 *                     example: "Unclaimed"
 *       500:
 *         description: Server error.
 */
router.get('/points', async (req, res) => {
  try {
    const users = await userRepository.findAll();
    const result: { address: string; referralAmount: number; paidPointAmount: number; airdropAmount: number; paidMemberAmount: number; status: string; totalClaimedAmount: number; }[] = []; // Changed to number

    for (const user of users) {
      const allocations = await allocationRepository.findByUserId(user.user_id);
      const totalClaimedAmount = await claimRepository.getTotalClaimedAmountByUserId(user.user_id); // Fetch total claimed amount

      let referralAmount = 0;
      let paidPointAmount = 0;
      let airdropAmount = 0;
      let paidMemberAmount = 0; // Added
      let hasUnclaimedAllocations = false;

      for (const alloc of allocations) {
        if (alloc.type === 'REFERRAL_REWARD') {
          referralAmount = referralAmount + parseFloat(alloc.amount);
        } else if (alloc.type === 'SPENDING_REWARD') {
          paidPointAmount = paidPointAmount + parseFloat(alloc.amount);
        } else if (alloc.type === 'AIRDROP') {
          airdropAmount = airdropAmount + parseFloat(alloc.amount);
        } else if (alloc.type === 'PAID_MEMBER') { // Added
          paidMemberAmount = paidMemberAmount + parseFloat(alloc.amount); // Added
        }

        if (!alloc.is_claimed) {
          hasUnclaimedAllocations = true;
        }
      }

      result.push({
        address: user.wallet_address,
        referralAmount: referralAmount,
        paidPointAmount: paidPointAmount,
        airdropAmount: airdropAmount,
        status: hasUnclaimedAllocations ? 'Unclaimed' : 'All Claimed',
        totalClaimedAmount: totalClaimedAmount, // Changed to number
        paidMemberAmount: paidMemberAmount, // Added
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching points:', error);
    res.status(500).send('Error fetching points');
  }
});

// Helper function to round up to one decimal place
const roundUpToOneDecimal = (num: number): number => { // Changed return type to number
  return Math.ceil(num * 10) / 10; // Removed .toFixed(1)
};

/**
 * @swagger
 * /api/spending-reward:
 *   post:
 *     summary: Process a spending reward for a user, allocating AMD and potentially qualifying them as a paid member.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - wallet_address
 *               - amount
 *             properties:
 *               wallet_address:
 *                 type: string
 *                 description: The wallet address of the user.
 *                 example: "0xC4f9004d8348E9d43c5c080ab0592Fc70c61657f"
 *               amount:
 *                 type: number
 *                 format: float
 *                 description: The amount spent in USD.
 *                 example: 10.5
 *     responses:
 *       200:
 *         description: Spending reward processed successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Spending reward processed successfully."
 *       400:
 *         description: Invalid request body.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Wallet address and amount are required"
 *       500:
 *         description: Server error.
 */
router.post('/spending-reward', async (req, res) => {
  const { wallet_address, amount } = req.body; // amount is in USD

  if (!wallet_address || !amount) {
    return res.status(400).send('Wallet address and amount are required');
  }

  // Trim and validate wallet address
  const trimmedWalletAddress = wallet_address.trim();
  if (!ethers.isAddress(trimmedWalletAddress)) {
    return res.status(400).send('Invalid wallet address format');
  }

  try {
    let user = await userRepository.findByWalletAddress(trimmedWalletAddress);
    if (!user) {
      user = await userRepository.create({ wallet_address: trimmedWalletAddress, total_spending_for_amd_allocation: '0', total_spent_money: '0', is_paid_member: false });
    }

    const parsedAmount = parseFloat(amount);

    // 1. AMD Allocation
    let amdToAllocate = 0;
    let newTotalSpendingForAmd = parseFloat(user.total_spending_for_amd_allocation) + parsedAmount;

    if (parseFloat(user.total_spending_for_amd_allocation) < MAX_SPENDING_FOR_AMD) {
      const eligibleSpending = Math.min(parsedAmount, MAX_SPENDING_FOR_AMD - parseFloat(user.total_spending_for_amd_allocation));
      amdToAllocate = eligibleSpending * AMD_ALLOCATION_RATE;
    }

    if (amdToAllocate > 0) {
      await allocationRepository.create({
        user_id: user.user_id,
        amount: amdToAllocate.toString(),
        type: 'SPENDING_REWARD', // New type
        source_info: `AMD allocation for ${parsedAmount} spending`,
        is_claimed: false,
        claim_id: null,
      });
      // Update total_spending_for_amd_allocation for the user
      await userRepository.update(user.user_id, { total_spending_for_amd_allocation: newTotalSpendingForAmd.toString() });
    }

    // Update total_spent_money for the user (for paid member qualification)
    const newTotalSpentMoney = (parseFloat(user.total_spent_money) + parsedAmount).toString();
    await userRepository.update(user.user_id, { total_spent_money: newTotalSpentMoney });

    // 2. Paid Member Qualification and AIM Allocation
    const paidMemberThreshold = PAID_MEMBER_THRESHOLD; // $9.5

    if (!user.is_paid_member && parseFloat(newTotalSpentMoney) >= paidMemberThreshold) {
      // User qualifies as a paid member
      const totalPaidMembers = await userRepository.getTotalPaidMemberCount(); // Get total count of paid members
      const blockNumber = Math.floor(totalPaidMembers / 100000) + 1; // Determine the 100,000-member block

      const baseAIMReward = 14000;
      let memberRewardAIM = baseAIMReward;
      let referrerRewardAIM = baseAIMReward;
      let referrerReferrerRewardAIM: number | null = baseAIMReward;

      if (blockNumber > 1) {
        // Calculate rewards for subsequent blocks
        memberRewardAIM = baseAIMReward * Math.pow(0.8, blockNumber - 1);
        referrerRewardAIM = baseAIMReward * Math.pow(0.8, blockNumber - 1);
        referrerReferrerRewardAIM = null; // No referrer's referrer reward for blocks > 1
      }

      // Apply rounding rule
      memberRewardAIM = roundUpToOneDecimal(memberRewardAIM);
      referrerRewardAIM = roundUpToOneDecimal(referrerRewardAIM);
      if (referrerReferrerRewardAIM !== null) {
        referrerReferrerRewardAIM = roundUpToOneDecimal(referrerReferrerRewardAIM);
      }

      // Update user as paid member
      await userRepository.update(user.user_id, {
        is_paid_member: true,
        paid_member_tier: blockNumber, // Store the block number as the tier
      });

      // Allocate AIM to the paid member
      await allocationRepository.create({
        user_id: user.user_id,
        amount: memberRewardAIM.toString(),
        type: 'PAID_MEMBER', // New type for paid member allocation
        source_info: `AMD for becoming Paid Member (Block ${blockNumber})`,
        is_claimed: false,
        claim_id: null,
      });

      // Allocate AIM to referrer
      if (user.referrer_id) {
        await allocationRepository.create({
          user_id: user.referrer_id,
          amount: referrerRewardAIM.toString(),
          type: 'REFERRAL_REWARD', // New type
          source_info: `AMD for referring Paid Member (User ID: ${user.user_id}, Block ${blockNumber})`,
          is_claimed: false,
          claim_id: null,
        });

        // Allocate AIM to referrer's referrer (only for Block 1)
        if (blockNumber === 1 && referrerReferrerRewardAIM !== null) {
          const referrerUser = await userRepository.findById(user.referrer_id);
          if (referrerUser && referrerUser.referrer_id) {
            await allocationRepository.create({
              user_id: referrerUser.referrer_id,
              amount: referrerReferrerRewardAIM.toString(),
              type: 'REFERRAL_REWARD',
              source_info: `AMD for referring referrer of Paid Member (User ID: ${user.user_id}, Block ${blockNumber})`,
              is_claimed: false,
              claim_id: null,
            });
          }
        }
      }
    }

    res.status(200).json({ message: 'Spending reward processed successfully.' });
  } catch (error) {
    console.error('Error processing spending reward:', error);
    res.status(500).send('Error processing spending reward');
  }
});

/**
 * @swagger
 * /api/referral:
 *   post:
 *     summary: Establish a referral link between two users.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - referrer_wallet_address
 *               - referred_wallet_address
 *             properties:
 *               referrer_wallet_address:
 *                 type: string
 *                 description: The wallet address of the referrer.
 *                 example: "0xC4f9004d8348E9d43c5c080ab0592Fc70c61657f"
 *               referred_wallet_address:
 *                 type: string
 *                 description: The wallet address of the referred user.
 *                 example: "0x1Ee741401ac6b2c8932d730a7C4163fdf87bE95C"
 *     responses:
 *       200:
 *         description: Referral link established successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Referral link established successfully."
 *                 referredUser:
 *                   $ref: '#/components/schemas/User' # Assuming User schema is defined elsewhere
 *       400:
 *         description: Invalid request body.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Referrer and referred wallet addresses are required"
 *       409:
 *         description: Conflict, user already referred by another.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "User has already been referred by another user."
 *       500:
 *         description: Server error.
 */
router.post('/referral', async (req, res) => {
  const { referrer_wallet_address, referred_wallet_address } = req.body;

  if (!referrer_wallet_address || !referred_wallet_address) {
    return res.status(400).send('Referrer and referred wallet addresses are required');
  }

  // Trim and validate wallet addresses
  const trimmedReferrerAddress = referrer_wallet_address.trim();
  const trimmedReferredAddress = referred_wallet_address.trim();
  
  if (!ethers.isAddress(trimmedReferrerAddress) || !ethers.isAddress(trimmedReferredAddress)) {
    return res.status(400).send('Invalid wallet address format');
  }

  if (trimmedReferrerAddress === trimmedReferredAddress) {
    console.error('Referrer wallet address and referred wallet address cannot be the same.');
    return res.status(400).send('Referrer wallet address and referred wallet address cannot be the same.');
  }

  try {
    let referrerUser = await userRepository.findByWalletAddress(trimmedReferrerAddress);
    if (!referrerUser) {
      referrerUser = await userRepository.create({ wallet_address: trimmedReferrerAddress, total_spending_for_amd_allocation: '0', total_spent_money: '0', is_paid_member: false });
    }

    let referredUser = await userRepository.findByWalletAddress(trimmedReferredAddress);
    if (!referredUser) {
      referredUser = await userRepository.create({ wallet_address: trimmedReferredAddress, referrer_id: referrerUser.user_id, total_spending_for_amd_allocation: '0', total_spent_money: '0', is_paid_member: false });
    } else {
      // If referred user already exists, update their referrer_id if not already set
      if (!referredUser.referrer_id) {
        await userRepository.update(referredUser.user_id, { referrer_id: referrerUser.user_id });
        referredUser.referrer_id = referrerUser.user_id; // Update local object
      } else if (referredUser.referrer_id !== referrerUser.user_id) {
        // If already referred by someone else, return a message
        return res.status(409).json({ message: 'User has already been referred by another user.' });
      }
    }

    // Create a referral reward allocation for the referrer
    if (referrerUser) {
      const referralRewardAmount = 14000; // Updated to match paid member reward amount
      await allocationRepository.create({
        user_id: referrerUser.user_id,
        amount: referralRewardAmount.toString(),
        type: 'REFERRAL_REWARD',
        source_info: `Referral link established with ${referredUser.wallet_address}`,
        is_claimed: false,
        claim_id: null,
      });
      console.log(`[Backend] Created referral reward for referrer ${referrerUser.wallet_address}`);
      // Trigger Merkle tree generation immediately after new allocation
      await generateMerkleTree();
      console.log('[Backend] Merkle tree generation triggered after referral.');
    }

    res.status(200).json({ message: 'Referral link established successfully.', referredUser });
  } catch (error) {
    console.error('Error establishing referral link:', error);
    res.status(500).send('Error establishing referral link');
  }
});

/**
 * @swagger
 * /api/airdrop:
 *   post:
 *     summary: Add an airdrop allocation for a user.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - wallet_address
 *               - amount
 *             properties:
 *               wallet_address:
 *                 type: string
 *                 description: The wallet address of the user.
 *                 example: "0xC4f9004d8348E9d43c5c080ab0592Fc70c61657f"
 *               amount:
 *                 type: string
 *                 description: The amount of the airdrop.
 *                 example: "50000"
 *     responses:
 *       201:
 *         description: Airdrop allocation created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Allocation' # Assuming Allocation schema is defined elsewhere
 *       400:
 *         description: Invalid request body.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Wallet address and amount are required"
 *       500:
 *         description: Server error.
 */
router.post('/airdrop', async (req, res) => {
  const { wallet_address, amount } = req.body;

  if (!wallet_address || !amount) {
    return res.status(400).send('Wallet address and amount are required');
  }

  // Trim and validate wallet address
  const trimmedWalletAddress = wallet_address.trim();
  if (!ethers.isAddress(trimmedWalletAddress)) {
    return res.status(400).send('Invalid wallet address format');
  }

  try {
    let user = await userRepository.findByWalletAddress(trimmedWalletAddress);
    if (!user) {
      user = await userRepository.create({ wallet_address: trimmedWalletAddress, total_spending_for_amd_allocation: '0', total_spent_money: '0', is_paid_member: false });
    }

    const allocation = await allocationRepository.create({
      user_id: user.user_id,
      amount,
      type: 'AIRDROP',
      source_info: 'Airdrop added via API',
      is_claimed: false,
      claim_id: null,
    });

    res.status(201).json(allocation);
  } catch (error) {
    console.error('Error adding airdrop:', error);
    res.status(500).send('Error adding airdrop');
  }
});

/**
 * @swagger
 * /api/claim:
 *   post:
 *     summary: Get the Merkle proof for a user to claim their rewards.
 *     tags: [Users]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - wallet_address
 *             properties:
 *               wallet_address:
 *                 type: string
 *                 description: The wallet address of the user.
 *                 example: "0xC4f9004d8348E9d43c5c080ab0592Fc70c61657f"
 *     responses:
 *       200:
 *         description: The Merkle proof and cumulative amount for the user.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: string
 *                 cumulativeAmount:
 *                   type: string
 *                   description: The cumulative amount of the user's rewards.
 *                 proof:
 *                   type: array
 *                   items:
 *                     type: string
 *                     format: byte
 *                   description: The Merkle proof.
 *       404:
 *         description: User or proof not found.
 *       500:
 *         description: Server error.
 */
router.post('/claim', async (req, res) => {
  const { wallet_address } = req.body;

  if (!wallet_address) {
    return res.status(400).send('Wallet address is required');
  }

  // Trim and validate wallet address
  const trimmedWalletAddress = wallet_address.trim();
  if (!ethers.isAddress(trimmedWalletAddress)) {
    return res.status(400).send('Invalid wallet address format');
  }

  try {
    const user = await userRepository.findByWalletAddress(trimmedWalletAddress);
    if (!user) {
      return res.status(404).send('User not found');
    }

    const activeDistribution = await merkleDistributionRepository.findActive();
    if (!activeDistribution) {
      return res.status(404).send('No active distribution found');
    }

    const merkleProof = await merkleProofRepository.findByDistributionAndUser(activeDistribution.distribution_id, user.user_id);
    if (!merkleProof) {
      return res.status(404).send('Proof not found for this user in the active distribution');
    }

    res.json({
      user: user.wallet_address,
      cumulativeAmount: ethers.formatUnits(merkleProof.amount, 18),
      proof: merkleProof.proof,
    });

  } catch (error) {
    console.error('Error fetching claim info:', error);
    res.status(500).send('Error fetching claim info');
  }
});



router.post('/release-batch', async (req, res) => {
    console.log('[Backend] /api/release-batch endpoint called');
    const { addresses } = req.body;
    console.log(`[Backend] Received batch release request for ${addresses.length} addresses.`);

    if (!addresses || !Array.isArray(addresses) || addresses.length === 0) {
        console.log('[Backend] Invalid request: No addresses provided.');
        return res.status(400).send('An array of addresses is required');
    }

    try {
        const keystorePath = './keystore/keystore-loyalty-point-admin.json';
        const keystoreJson = fs.readFileSync(keystorePath, 'utf8');
        const password = checkKeystorePassword();

        const wallet = await ethers.Wallet.fromEncryptedJson(keystoreJson, password);
        console.log('[Backend] Wallet loaded successfully.');
        
        const provider = new ethers.JsonRpcProvider(chains.bsc.rpcUrls[0]);
        const connectedWallet = wallet.connect(provider);
        const loyaltyPointContract = new ethers.Contract(loyaltyPointAddress, loyaltyPointABI, connectedWallet) as unknown as LoyaltyPointContract;

        interface BatchResult {
            address: string;
            success: boolean;
            txHash: string | null;
            error: string | null;
        }
        const results: BatchResult[] = [];

        for (const address of addresses) {
            console.log(`[Backend] Processing address: ${address}`);
            try {
                const user = await userRepository.findByWalletAddress(address);
                if (!user) {
                    console.warn(`[Backend] User not found for address: ${address}`);
                    throw new Error('User not found');
                }

                const activeDistribution = await merkleDistributionRepository.findActive();
                if (!activeDistribution) {
                    console.warn('[Backend] No active distribution found.');
                    throw new Error('No active distribution found');
                }

                const merkleProof = await merkleProofRepository.findByDistributionAndUser(activeDistribution.distribution_id, user.user_id);
                if (!merkleProof) {
                    console.warn(`[Backend] Proof not found for user ${user.user_id} in active distribution.`);
                    throw new Error('Proof not found for this user in the active distribution');
                }

                console.log(`[Backend] Attempting to claim for user ${user.wallet_address} with amount ${merkleProof.amount}.`);
                const tx = await loyaltyPointContract.claimForUser(user.wallet_address, ethers.toBigInt(merkleProof.amount), merkleProof.proof);
                console.log(`[Backend] Transaction sent for ${user.wallet_address}. Tx hash: ${tx.hash}`);
                const receipt = await tx.wait();

                if (!receipt) {
                    console.error(`[Backend] Transaction failed for ${user.wallet_address}: no receipt was returned.`);
                    throw new Error('Transaction failed: no receipt was returned.');
                }
                
                console.log(`[Backend] Transaction confirmed for ${user.wallet_address}. Receipt: ${receipt.hash}`);
                results.push({
                    address: address,
                    success: true,
                    txHash: receipt.hash,
                    error: null
                });

            } catch (error: any) {
                console.error(`[Backend] Error processing address ${address}: ${error.message}`);
                results.push({
                    address: address,
                    success: false,
                    txHash: null,
                    error: error.message
                });
            }
        }

        console.log('[Backend] Batch release process completed.');
        res.json({
            message: 'Batch release process finished.',
            results: results
        });

    } catch (error: unknown) {
        console.error('[Backend] Error during batch release:', (error as Error).message);
        res.status(500).send(`Error during batch release: ${(error as Error).message}`);
    }
});

export default router;
