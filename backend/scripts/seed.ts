import pool from '../src/database/db';
import { PgUserRepository } from '../src/repositories/pg/PgUserRepository';
import { PgAllocationRepository } from '../src/repositories/pg/PgAllocationRepository';
import { AllocationType } from '../src/models/Allocation';

const userRepository = new PgUserRepository(pool);
const allocationRepository = new PgAllocationRepository(pool);

interface UserData {
  walletAddress: string;
  allocations: {
    type: AllocationType;
    amount: string;
  }[];
}

const testData: UserData[] = [
  {
    walletAddress: '0xC4f9004d8348E9d43c5c080ab0592Fc70c61657f',
    allocations: [
      { type: 'REFERRAL', amount: '14000' },
      { type: 'PAID_POINT', amount: '1000' },
      { type: 'AIRDROP', amount: '100000' },
    ],
  },
  {
    walletAddress: '0x1Ee741401ac6b2c8932d730a7C4163fdf87bE95C',
    allocations: [
      { type: 'REFERRAL', amount: '28000' },
      { type: 'PAID_POINT', amount: '2000' },
      { type: 'AIRDROP', amount: '500000' },
    ],
  },
];

async function seedData() {
  console.log('Starting data seeding...');
  try {
    for (const userData of testData) {
      let user = await userRepository.findByWalletAddress(userData.walletAddress);

      if (!user) {
        console.log(`Creating user with wallet address: ${userData.walletAddress}`);
        user = await userRepository.create({ wallet_address: userData.walletAddress });
      } else {
        console.log(`User with wallet address ${userData.walletAddress} already exists.`);
      }

      for (const allocation of userData.allocations) {
        console.log(`Creating ${allocation.type} allocation for user ${user.user_id} with amount ${allocation.amount}`);
        await allocationRepository.create({
          user_id: user.user_id,
          amount: allocation.amount,
          type: allocation.type,
          source_info: `Test data for ${allocation.type}`,
          is_claimed: false,
          claim_id: null,
        });
      }
    }
    console.log('Data seeding completed successfully!');
  } catch (error) {
    console.error('Error during data seeding:', error);
  } finally {
    await pool.end(); // Close the database connection pool
  }
}

seedData();
