import { Pool } from 'pg';
import { IClaimRepository } from '../interfaces';
import { Claim } from '../../models/Claim';
import pool from '../../database/db';

export class PgClaimRepository implements IClaimRepository {
  constructor(private db: Pool) {}

  async findById(id: number): Promise<Claim | null> {
    const result = await this.db.query<Claim>('SELECT * FROM claim WHERE claim_id = $1', [id]);
    return result.rows[0] || null;
  }

  async create(claim: Omit<Claim, 'claim_id' | 'created_at'>): Promise<Claim> {
    const result = await this.db.query<Claim>(
      'INSERT INTO claim(user_id, amount, total_claimed_amount, transaction_hash, status) VALUES($1, $2, $3, $4, $5) RETURNING *'
      , [claim.user_id, claim.amount, claim.total_claimed_amount, claim.transaction_hash, claim.status]
    );
    return result.rows[0];
  }

  async update(id: number, claim: Partial<Claim>): Promise<Claim | null> {
    const fields = Object.keys(claim).map((key, index) => `"${key}" = $${index + 2}`).join(', ');
    const values = Object.values(claim);
    if (fields.length === 0) return this.findById(id); // No fields to update

    const result = await this.db.query<Claim>(
      `UPDATE claim SET ${fields} WHERE claim_id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.query('DELETE FROM claim WHERE claim_id = $1', [id]);
    return result.rowCount > 0;
  }

  async findByUserId(userId: number): Promise<Claim[]> {
    const result = await this.db.query<Claim>('SELECT * FROM claim WHERE user_id = $1', [userId]);
    return result.rows;
  }

  async findByTransactionHash(transactionHash: string): Promise<Claim | null> {
    const result = await this.db.query<Claim>('SELECT * FROM claim WHERE transaction_hash = $1', [transactionHash]);
    return result.rows[0] || null;
  }

  async getTotalClaimedAmountByUserId(userId: number): Promise<number> {
    const result = await this.db.query<{ sum: string }>(
      'SELECT SUM(amount) FROM claim WHERE user_id = $1',
      [userId]
    );
    return parseFloat(result.rows[0].sum || '0');
  }
}