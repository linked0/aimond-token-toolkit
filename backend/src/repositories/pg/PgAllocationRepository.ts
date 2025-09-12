import { Pool } from 'pg';
import { IAllocationRepository } from '../interfaces';
import { Allocation } from '../../models/Allocation';
import pool from '../../database/db';

export class PgAllocationRepository implements IAllocationRepository {
  constructor(private db: Pool) {}

  async findById(id: number): Promise<Allocation | null> {
    const result = await this.db.query<Allocation>('SELECT * FROM allocation WHERE allocation_id = $1', [id]);
    return result.rows[0] || null;
  }

  async create(allocation: Omit<Allocation, 'allocation_id' | 'created_at'>): Promise<Allocation> {
    const result = await this.db.query<Allocation>(
      'INSERT INTO allocation(user_id, amount, type, source_info, is_claimed, claim_id) VALUES($1, $2, $3, $4, $5, $6) RETURNING *'
      , [allocation.user_id, allocation.amount, allocation.type, allocation.source_info, allocation.is_claimed, allocation.claim_id]
    );
    return result.rows[0];
  }

  async update(id: number, allocation: Partial<Allocation>): Promise<Allocation | null> {
    const fields = Object.keys(allocation).map((key, index) => `"${key}" = $${index + 2}`).join(', ');
    const values = Object.values(allocation);
    if (fields.length === 0) return this.findById(id); // No fields to update

    const result = await this.db.query<Allocation>(
      `UPDATE allocation SET ${fields} WHERE allocation_id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.query('DELETE FROM allocation WHERE allocation_id = $1', [id]);
    return result.rowCount > 0;
  }

  async findByUserId(userId: number): Promise<Allocation[]> {
    const result = await this.db.query<Allocation>('SELECT * FROM allocation WHERE user_id = $1', [userId]);
    return result.rows;
  }

  async findByClaimId(claimId: number): Promise<Allocation[]> {
    const result = await this.db.query<Allocation>('SELECT * FROM allocation WHERE claim_id = $1', [claimId]);
    return result.rows;
  }

  async findUnclaimed(): Promise<Allocation[]> {
    const result = await this.db.query<Allocation>('SELECT * FROM allocation WHERE is_claimed = FALSE');
    return result.rows;
  }

  async findUnclaimedByUserId(userId: number): Promise<Allocation[]> {
    const result = await this.db.query<Allocation>('SELECT * FROM allocation WHERE is_claimed = FALSE AND user_id = $1', [userId]);
    return result.rows;
  }
}