import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const createDbUser = async () => {
  const pool = new Pool({
    user: process.env.PG_SUPER_USER || 'postgres',
    host: process.env.DB_HOST,
    database: 'postgres',
    password: process.env.PG_SUPER_USER_PASSWORD,
    port: Number(process.env.DB_PORT),
  });

  const client = await pool.connect();

  const dbName = process.env.DB_NAME;
  const dbUser = process.env.DB_USER;
  const dbPassword = process.env.DB_PASSWORD;

  try {
    const dbExists = await client.query(`SELECT 1 FROM pg_database WHERE datname = $1`, [dbName]);
    if (dbExists.rowCount === 0) {
      console.log(`Creating database: ${dbName}`);
      await client.query(`CREATE DATABASE "${dbName}"`);
      console.log('Database created.');
    } else {
      console.log('Database already exists.');
    }

    const userExists = await client.query(`SELECT 1 FROM pg_roles WHERE rolname = $1`, [dbUser]);
    if (userExists.rowCount === 0) {
      console.log(`Creating user: ${dbUser}`);
      await client.query(`CREATE USER ${dbUser} WITH PASSWORD '${dbPassword}'`);
      console.log('User created.');
    } else {
      console.log('User already exists.');
    }

    console.log(`Granting privileges on database ${dbName} to ${dbUser}`);
    await client.query(`GRANT ALL PRIVILEGES ON DATABASE "${dbName}" TO ${dbUser}`);
    console.log('Privileges granted.');

  } catch (error) {
    console.error('Error during database or user creation:', error);
  } finally {
    client.release();
    await pool.end();
  }
};

createDbUser().catch(err => {
    console.error(err);
    process.exit(1);
});
