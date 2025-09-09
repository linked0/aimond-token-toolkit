import express from 'express';
import pool from './database/db'; // Import the pool from db.ts
import { PgUserRepository } from './repositories/pg/PgUserRepository';
import { PgAllocationRepository } from './repositories/pg/PgAllocationRepository';
import userRoutes from './routes/userRoutes';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './swagger';

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

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
