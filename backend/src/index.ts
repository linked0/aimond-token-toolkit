import express from 'express';
import dotenv from 'dotenv';
import pool from './database/db'; // Import the pool from db.ts
import { PgUserRepository } from './repositories/pg/PgUserRepository';
import { PgAllocationRepository } from './repositories/pg/PgAllocationRepository';
import userRoutes from './routes/userRoutes';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger';
import { generateMerkleTree } from './services/merkleTreeService';
import { startClaimedEventListener } from './services/eventListenerService';

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

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api', userRoutes);

app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);
  
});

// Periodic Merkle Tree Generation
const intervalSeconds = parseInt(process.env.MERKLE_TREE_GENERATION_INTERVAL_SECONDS || '0', 10);

if (intervalSeconds > 0) {
  console.log(`[Scheduler] Starting periodic Merkle tree generation every ${intervalSeconds} seconds.`);
  setInterval(async () => {
    try {
      await generateMerkleTree();
    } catch (error) {
      console.error('[Scheduler] Error during scheduled Merkle tree generation:', error);
    }
  }, intervalSeconds * 1000);
} else {
  console.log('[Scheduler] Periodic Merkle tree generation is disabled.');
}

// Start listening for Claimed events
startClaimedEventListener();
