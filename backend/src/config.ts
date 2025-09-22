import dotenv from 'dotenv';

// Determine which .env file to load based on the ENV_FILE environment variable.
const envFile = process.env.ENV_FILE || '.env';

console.log(`[Config] Loading environment variables from: ${envFile}`);

// Load the environment variables. This code will now run before any other application file.
dotenv.config({ path: envFile });

console.log(`[Config] DB_USER is set to: ${process.env.DB_USER}`);
