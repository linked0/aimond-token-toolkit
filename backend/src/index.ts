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
import { startHttpEventPolling } from './services/httpEventPollingService';
import * as fs from 'fs';

// Global type declaration for SSE clients
declare global {
  var claimedEventClients: express.Response[];
}

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

// Server-Sent Events endpoint for claimed events
app.get('/api/events/claimed', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Cache-Control'
  });

  // Store the response object to send events
  global.claimedEventClients = global.claimedEventClients || [];
  global.claimedEventClients.push(res);

  // Send initial connection message
  res.write(`data: ${JSON.stringify({ type: 'connected', message: 'Connected to claimed events stream' })}\n\n`);

  // Handle client disconnect
  req.on('close', () => {
    global.claimedEventClients = global.claimedEventClients.filter(client => client !== res);
  });
});

app.listen(port, async () => {
  console.log(`Server is running on http://localhost:${port}`);
  
  // Log loyalty point admin address
  try {
    const keystorePath = './keystore/keystore-loyalty-point-admin.json';
    const keystoreJson = fs.readFileSync(keystorePath, 'utf8');
    const keystore = JSON.parse(keystoreJson);
    console.log(`[LoyaltyPointAdmin] Admin address: ${keystore.address}`);
  } catch (error) {
    console.error('[LoyaltyPointAdmin] Failed to load admin address:', error);
  }
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

// Start listening for Claimed events with hybrid approach
let eventListener: any = null;
let httpPolling: any = null;
let isWebSocketActive = false;
let isHttpPollingActive = false;
let lastHealthCheck = Date.now();

// Hybrid approach: WebSocket primary, HTTP polling backup
console.log('[Main] Starting hybrid event monitoring system...');
console.log('[Main] Attempting to start WebSocket event listener as primary...');

// Start WebSocket listener
eventListener = startClaimedEventListener();

// Set up health monitoring and automatic failover
const healthCheckInterval = setInterval(() => {
  const now = Date.now();
  const timeSinceLastCheck = now - lastHealthCheck;
  
  // Check WebSocket health
  const wsHealthy = (global as any).isWebSocketHealthy;
  const httpHealthy = httpPolling ? httpPolling.isHealthy() : false;
  
  // If WebSocket is unhealthy and HTTP polling is not active, start HTTP polling
  if (!wsHealthy && !isHttpPollingActive) {
    console.log('[Main] WebSocket appears unhealthy, switching to HTTP polling...');
    isWebSocketActive = false;
    httpPolling = startHttpEventPolling();
    isHttpPollingActive = true;
    lastHealthCheck = now;
  }
  
  // If WebSocket is healthy and HTTP polling is active, stop HTTP polling
  if (wsHealthy && isHttpPollingActive) {
    console.log('[Main] WebSocket is healthy again, stopping HTTP polling...');
    if (httpPolling && httpPolling.stop) {
      httpPolling.stop();
    }
    isHttpPollingActive = false;
    isWebSocketActive = true;
    lastHealthCheck = now;
  }
  
  // If both are unhealthy, try to restart WebSocket
  if (!wsHealthy && !httpHealthy) {
    console.log('[Main] Both WebSocket and HTTP polling unhealthy, attempting restart...');
    try {
      eventListener = startClaimedEventListener();
      isWebSocketActive = true;
      lastHealthCheck = now;
    } catch (error) {
      console.log('[Main] WebSocket restart failed');
    }
  }
}, 10000); // Check every 10 seconds

// Periodic catch-up verification (every 5 minutes)
const catchUpInterval = setInterval(() => {
  if (isHttpPollingActive && httpPolling && httpPolling.runCatchUp) {
    console.log('[Main] Running periodic catch-up verification...');
    httpPolling.runCatchUp();
  }
}, 300000); // Every 5 minutes

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[Main] Received SIGINT, shutting down gracefully...');
  clearInterval(healthCheckInterval);
  clearInterval(catchUpInterval);
  if (eventListener && eventListener.disconnect) {
    eventListener.disconnect();
  }
  if (httpPolling && httpPolling.stop) {
    httpPolling.stop();
  }
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[Main] Received SIGTERM, shutting down gracefully...');
  clearInterval(healthCheckInterval);
  clearInterval(catchUpInterval);
  if (eventListener && eventListener.disconnect) {
    eventListener.disconnect();
  }
  if (httpPolling && httpPolling.stop) {
    httpPolling.stop();
  }
  process.exit(0);
});
