import express from 'express';
import pool from './database/db'; // Import the pool from db.ts
import { PgUserRepository } from './repositories/pg/PgUserRepository';
import { PgAllocationRepository } from './repositories/pg/PgAllocationRepository';

const app = express();
const port = process.env.PORT || 3000;

const userRepository = new PgUserRepository(pool);
const allocationRepository = new PgAllocationRepository(pool);

app.use(express.json());

// Simple request logger middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

app.get('/', (req, res) => {
  res.send('Hello from Express.js backend!');
});

// Example of a simple database query (will be abstracted later)
app.get('/test-db', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    res.json({ currentTime: result.rows[0].now });
  } catch (err) {
    console.error('Database query error', err);
    res.status(500).send('Error connecting to database');
  }
});

app.get('/points', async (req, res) => {
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
        if (alloc.type === 'REFERRAL') {
          referralAmount = (parseFloat(referralAmount) + parseFloat(alloc.amount)).toString();
        } else if (alloc.type === 'PAID_POINT') {
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
        status: hasUnclaimedAllocations ? 'Unclaimed' : 'All Claimed', // Simplified status
      });
    }

    res.json(result);
  } catch (error) {
    console.error('Error fetching points:', error);
    res.status(500).send('Error fetching points');
  }
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
