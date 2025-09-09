import express from 'express';
import { PgUserRepository } from '../repositories/pg/PgUserRepository';
import { PgAllocationRepository } from '../repositories/pg/PgAllocationRepository';
import pool from '../database/db'; // Import the pool from db.ts

const router = express.Router();

const userRepository = new PgUserRepository(pool);
const allocationRepository = new PgAllocationRepository(pool);

const PAID_MEMBER_THRESHOLD = 9.5; // $9.5 threshold for a paid new member
const AMD_ALLOCATION_RATE = 1000; // 1000 AMD per $1
const MAX_SPENDING_FOR_AMD = 5000000; // $5,000,000 cap

router.get('/points', async (req, res) => {
  try {
    const users = await userRepository.findAll();
    const result: { address: string; referralAmount: string; paidPointAmount: string; airdropAmount: string; status: string; }[] = [];

    for (const user of users) {
      const allocations = await allocationRepository.findByUserId(user.user_id);

      let referralAmount = '0';
      let paidPointAmount = '0';
      let airdropAmount = '0';
      let hasUnclaimedAllocations = false;

      for (const alloc of allocations) {
        if (alloc.type === 'REFERRAL_REWARD') {
          referralAmount = (parseFloat(referralAmount) + parseFloat(alloc.amount)).toString();
        } else if (alloc.type === 'SPENDING_REWARD') {
          paidPointAmount = (parseFloat(paidPointAmount) + parseFloat(alloc.amount)).toString();
        } else if (alloc.type === 'AIRDROP') {
          airdropAmount = (parseFloat(airdropAmount) + parseFloat(alloc.amount)).toString();
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
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching points:', error);
    res.status(500).send('Error fetching points');
  }
});

// Helper function to round up to one decimal place
const roundUpToOneDecimal = (num: number): string => {
  return (Math.ceil(num * 10) / 10).toFixed(1);
};

// Endpoint to add a loyalty point allocation (now handles AMD and AIM)
router.post('/spending-reward', async (req, res) => {
  const { wallet_address, amount } = req.body; // amount is in USD

  if (!wallet_address || !amount) {
    return res.status(400).send('Wallet address and amount are required');
  }

  try {
    let user = await userRepository.findByWalletAddress(wallet_address);
    if (!user) {
      user = await userRepository.create({ wallet_address, total_spending_for_amd_allocation: '0', total_spent_money: '0', is_paid_member: false });
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
      memberRewardAIM = parseFloat(roundUpToOneDecimal(memberRewardAIM));
      referrerRewardAIM = parseFloat(roundUpToOneDecimal(referrerRewardAIM));
      if (referrerReferrerRewardAIM !== null) {
        referrerReferrerRewardAIM = parseFloat(roundUpToOneDecimal(referrerReferrerRewardAIM));
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
        type: 'SPENDING_REWARD', // New type
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

// Endpoint to establish a referral link
router.post('/referral', async (req, res) => {
  const { referrer_wallet_address, referred_wallet_address } = req.body;

  if (!referrer_wallet_address || !referred_wallet_address) {
    return res.status(400).send('Referrer and referred wallet addresses are required');
  }

  try {
    let referrerUser = await userRepository.findByWalletAddress(referrer_wallet_address);
    if (!referrerUser) {
      referrerUser = await userRepository.create({ wallet_address: referrer_wallet_address, total_spending_for_amd_allocation: '0', total_spent_money: '0', is_paid_member: false });
    }

    let referredUser = await userRepository.findByWalletAddress(referred_wallet_address);
    if (!referredUser) {
      referredUser = await userRepository.create({ wallet_address: referred_wallet_address, referrer_id: referrerUser.user_id, total_spending_for_amd_allocation: '0', total_spent_money: '0', is_paid_member: false });
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

    res.status(200).json({ message: 'Referral link established successfully.', referredUser });
  } catch (error) {
    console.error('Error establishing referral link:', error);
    res.status(500).send('Error establishing referral link');
  }
});

// Endpoint to add an airdrop allocation
router.post('/airdrop', async (req, res) => {
  const { wallet_address, amount } = req.body;

  if (!wallet_address || !amount) {
    return res.status(400).send('Wallet address and amount are required');
  }

  try {
    let user = await userRepository.findByWalletAddress(wallet_address);
    if (!user) {
      user = await userRepository.create({ wallet_address, total_spending_for_amd_allocation: '0', total_spent_money: '0', is_paid_member: false });
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

export default router;