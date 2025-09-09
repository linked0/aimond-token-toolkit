import pool from '../src/database/db';
import { AllocationType } from '../src/models/Allocation';

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
      { type: 'REFERRAL_REWARD', amount: '14000' },
      { type: 'SPENDING_REWARD', amount: '1000' },
      { type: 'AIRDROP', amount: '100000' },
    ],
  },
  {
    walletAddress: '0x1Ee741401ac6b2c8932d730a7C4163fdf87bE95C',
    allocations: [
      { type: 'REFERRAL_REWARD', amount: '28000' },
      { type: 'SPENDING_REWARD', amount: '2000' },
      { type: 'AIRDROP', amount: '500000' },
    ],
  },
];

async function seedData() {
  console.log('Starting data seeding...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    console.log('Clearing old data...');
    await client.query('TRUNCATE TABLE "user", "allocation" RESTART IDENTITY CASCADE');

    const usersToCreate = testData.map(data => ({
      wallet_address: data.walletAddress,
      total_spending_for_amd_allocation: '0',
      total_spent_money: '0',
      is_paid_member: false,
    }));

    if (usersToCreate.length > 0) {
        const userValues = usersToCreate.map(user => `('${user.wallet_address}', '0', '0', false)`).join(',');
        const userInsertQuery = `INSERT INTO "user" (wallet_address, total_spending_for_amd_allocation, total_spent_money, is_paid_member) VALUES ${userValues} RETURNING user_id, wallet_address`;

        console.log('Creating users...');
        const insertedUsersResult = await client.query(userInsertQuery);
        const insertedUsers: { user_id: number, wallet_address: string }[] = insertedUsersResult.rows;

        const userMap = new Map(insertedUsers.map(user => [user.wallet_address, user.user_id]));

        const allocationsToCreate = testData.flatMap(data => {
            const userId = userMap.get(data.walletAddress);
            if (!userId) {
                throw new Error(`Could not find user with wallet address ${data.walletAddress}`);
            }
            return data.allocations.map(alloc => ({
                user_id: userId,
                amount: alloc.amount,
                type: alloc.type,
                source_info: `Test data for ${alloc.type}`,
                is_claimed: false,
                claim_id: null,
            }));
        });

        if (allocationsToCreate.length > 0) {
            const allocationValues = allocationsToCreate.map(alloc => `(${alloc.user_id}, '${alloc.amount}', '${alloc.type}', 'Test data for ${alloc.type}', false, NULL)`).join(',');
            const allocationInsertQuery = `INSERT INTO "allocation" (user_id, amount, type, source_info, is_claimed, claim_id) VALUES ${allocationValues}`;
            console.log('Creating allocations...');
            await client.query(allocationInsertQuery);
        }
    }

    await client.query('COMMIT');
    console.log('Data seeding completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error during data seeding:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

seedData();