import pool from '../src/database/db';

const setupDatabase = async () => {
  const client = await pool.connect();
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
        total_claimed_amount DECIMAL(20, 8),
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
        amount DECIMAL(20, 8) NOT NULL,
        proof TEXT[] NOT NULL
      );
    `);
    console.log('merkle_proof table created.');

    await client.query('COMMIT');
    console.log('Database setup complete.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error setting up database:', error);
  } finally {
    client.release();
  }
};

setupDatabase();
