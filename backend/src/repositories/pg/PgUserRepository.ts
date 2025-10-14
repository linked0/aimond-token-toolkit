import { Pool } from 'pg';
import { IUserRepository } from '../interfaces';
import { User } from '../../models/User';
import pool from '../../database/db';
import { ethers } from 'ethers';

export class PgUserRepository implements IUserRepository {
  constructor(private db: Pool) {}

  private normalizeWalletAddress(walletAddress: string): string {
    const trimmed = walletAddress.trim();
    if (!ethers.isAddress(trimmed)) {
      throw new Error(`Invalid wallet address format: "${walletAddress}"`);
    }
    return trimmed;
  }

  async findById(id: number): Promise<User | null> {
    const result = await this.db.query<User>('SELECT * FROM "user" WHERE user_id = $1', [id]);
    return result.rows[0] || null;
  }

  async findByWalletAddress(walletAddress: string): Promise<User | null> {
    const normalizedAddress = this.normalizeWalletAddress(walletAddress);
    const result = await this.db.query<User>('SELECT * FROM "user" WHERE wallet_address = $1', [normalizedAddress]);
    return result.rows[0] || null;
  }

  async create(user: Omit<User, 'user_id' | 'created_at'>): Promise<User> {
    const {
      wallet_address,
      referrer_id = null,
      total_spending_for_amd_allocation,
      total_spent_money,
      is_paid_member,
      paid_member_tier = null,
    } = user;
    
    const normalizedWalletAddress = this.normalizeWalletAddress(wallet_address);
    
    const result = await this.db.query<User>(
      'INSERT INTO "user"(wallet_address, referrer_id, total_spending_for_amd_allocation, total_spent_money, is_paid_member, paid_member_tier) VALUES($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        normalizedWalletAddress,
        referrer_id,
        total_spending_for_amd_allocation,
        total_spent_money,
        is_paid_member,
        paid_member_tier,
      ]
    );
    return result.rows[0];
  }

  async update(id: number, user: Partial<User>): Promise<User | null> {
    const fields = Object.keys(user)
      .map((key, index) => `"${key}" = $${index + 2}`)
      .join(', ');
    const values = Object.values(user);
    if (!fields) return this.findById(id);

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

  async getTotalPaidMemberCount(): Promise<number> {
    const result = await this.db.query<{ count: string }>('SELECT COUNT(*) FROM "user" WHERE is_paid_member = TRUE');
    return parseInt(result.rows[0].count, 10);
  }
}
