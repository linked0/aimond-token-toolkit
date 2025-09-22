"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const db_1 = __importDefault(require("../src/database/db"));
const dropAllTables = async () => {
    const client = await db_1.default.connect();
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
    }
    catch (error) {
        await client.query('ROLLBACK');
        console.error('Error dropping tables:', error);
    }
    finally {
        client.release();
    }
};
dropAllTables();
// Close the pool when the application exits
process.on('beforeExit', () => {
    db_1.default.end();
});
//# sourceMappingURL=dropObsoleteTables.js.map