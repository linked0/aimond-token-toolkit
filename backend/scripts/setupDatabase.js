"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../src/database/db"));
const ethers_1 = require("ethers");
const setupDatabase = async () => {
    console.log('[setupDatabase] Starting database setup...');
    const client = await db_1.default.connect();
    try {
        await client.query('BEGIN');
        // Drop existing tables to ensure a clean slate
        await client.query('DROP TABLE IF EXISTS merkle_proof CASCADE');
        await client.query('DROP TABLE IF EXISTS merkle_distribution CASCADE');
        await client.query('DROP TABLE IF EXISTS claim CASCADE');
        await client.query('DROP TABLE IF EXISTS allocation CASCADE');
        await client.query('DROP TABLE IF EXISTS "user" CASCADE');
        console.log('Creating tables...');
        // Create user table
        await client.query(`
      CREATE TABLE "user" (
        user_id SERIAL PRIMARY KEY,
        wallet_address VARCHAR(255) UNIQUE NOT NULL,
        referrer_id INTEGER REFERENCES "user"(user_id),
        total_spending_for_amd_allocation DECIMAL(20, 8) NOT NULL DEFAULT 0,
        total_spent_money DECIMAL(20, 8) NOT NULL DEFAULT 0,
        is_paid_member BOOLEAN NOT NULL DEFAULT FALSE,
        paid_member_tier INTEGER,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('user table created.');
        // Create claim table
        await client.query(`
      CREATE TABLE claim (
        claim_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "user"(user_id),
        amount DECIMAL(20, 8) NOT NULL,
        total_claimed_amount DECIMAL(20, 8) DEFAULT 0,
        transaction_hash VARCHAR(255),
        status VARCHAR(50),
        claim_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('claim table created.');
        // Create allocation table
        await client.query(`
      CREATE TABLE allocation (
        allocation_id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES "user"(user_id),
        type VARCHAR(50) NOT NULL,
        amount DECIMAL(20, 8) NOT NULL,
        is_claimed BOOLEAN DEFAULT FALSE,
        source_info VARCHAR(255),
        claim_id INTEGER REFERENCES claim(claim_id),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
        console.log('allocation table created.');
        // Create merkle_distribution table
        await client.query(`
      CREATE TABLE merkle_distribution (
        distribution_id SERIAL PRIMARY KEY,
        distribution_name VARCHAR(255) NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
        merkle_root VARCHAR(255) NOT NULL
      );
    `);
        console.log('merkle_distribution table created.');
        // Create merkle_proof table
        await client.query(`
      CREATE TABLE merkle_proof (
        proof_id SERIAL PRIMARY KEY,
        distribution_id INTEGER REFERENCES merkle_distribution(distribution_id),
        user_id INTEGER REFERENCES "user"(user_id) NOT NULL,
        amount TEXT NOT NULL,
        proof TEXT[] NOT NULL
      );
    `);
        console.log('merkle_proof table created.');
        console.log('Seeding initial data...');
        const NUM_TEST_USERS = 5; // Generate 5 random test users
        const testData = [];
        for (let i = 0; i < NUM_TEST_USERS; i++) {
            const wallet = ethers_1.ethers.Wallet.createRandom();
            testData.push({ walletAddress: wallet.address });
        }
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
            const insertedUsers = await client.query(userInsertQuery);
            insertedUsers.rows.forEach(user => {
                console.log(`Created user with wallet address: ${user.wallet_address}`);
            });
        }
        console.log('Initial data seeded.');
        await client.query('COMMIT');
        console.log('Database setup complete.');
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error setting up database:', error);
    }
    finally {
        client.release();
    }
};
setupDatabase();
//# sourceMappingURL=setupDatabase.js.map