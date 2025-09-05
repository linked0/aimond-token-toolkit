import { Pool } from 'pg';
import { IUserRepository } from '../interfaces';
import { User } from '../../models/User';
import pool from '../../database/db';

export class PgUserRepository implements IUserRepository {
  constructor(private db: Pool) {}

  async findById(id: number): Promise<User | null> {
    const result = await this.db.query<User>('SELECT * FROM "user" WHERE user_id = $1', [id]);
    return result.rows[0] || null;
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    const result = await this.db.query<User>('SELECT * FROM "user" WHERE wallet_address = $1', [walletAddress]);
    return result.rows[0] || null;
  }

  async create(user: Omit<User, 'user_id' | 'created_at'>): Promise<User> {
    const result = await this.db.query<User>(
      'INSERT INTO "user"(wallet_address, referrer_id) VALUES($1, $2) RETURNING *'
      , [user.wallet_address, user.referrer_id]
    );
    return result.rows[0];
  }

  async update(id: number, user: Partial<User>): Promise<User | null> {
    const fields = Object.keys(user).map((key, index) => `"${key}" = $${index + 2}`).join(', ');
    const values = Object.values(user);
    if (fields.length === 0) return this.findById(id); // No fields to update

    const result = await this.db.query<User>(
      `UPDATE "user" SET ${fields} WHERE user_id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.query('DELETE FROM "user" WHERE user_id = $1', [id]);
    return (result.rowCount ?? 0) > 0;
  }

  async findAll(): Promise<User[]> {
    const result = await this.db.query<User>('SELECT * FROM "user"');
    return result.rows;
  }
}