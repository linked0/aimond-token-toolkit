import { Pool } from 'pg';
import pool from '../src/database/db';

const dropAllTables = async () => {
  const client = await pool.connect();
  try {
    console.log('Dropping all tables...');
    await client.query('BEGIN');

    await client.query('DROP TABLE IF EXISTS allocation CASCADE;');
    console.log('allocation table dropped (if it existed).');

    await client.query('DROP TABLE IF EXISTS claim CASCADE;');
    console.log('claim table dropped (if it existed).');

    await client.query('DROP TABLE IF EXISTS merkle_distribution CASCADE;');
    console.log('merkle_distribution table dropped (if it existed).');

    await client.query('DROP TABLE IF EXISTS merkle_proof CASCADE;');
    console.log('merkle_proof table dropped (if it existed).');

    await client.query('DROP TABLE IF EXISTS "user" CASCADE;');
    console.log('user table dropped (if it existed).');

    await client.query('DROP TABLE IF EXISTS users CASCADE;');
    console.log('users table dropped (if it existed).');

    await client.query('DROP TABLE IF EXISTS paid_member_tiers CASCADE;');
    console.log('paid_member_tiers table dropped (if it existed).');

    await client.query('COMMIT');
    console.log('All tables dropped successfully.');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error dropping tables:', error);
  } finally {
    client.release();
  }
};

dropAllTables();

// Close the pool when the application exits
process.on('beforeExit', () => {
  pool.end();
});
