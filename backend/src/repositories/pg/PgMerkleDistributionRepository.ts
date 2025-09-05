import { Pool } from 'pg';
import { IMerkleDistributionRepository } from '../interfaces';
import { MerkleDistribution } from '../../models/MerkleDistribution';
import pool from '../../database/db';

export class PgMerkleDistributionRepository implements IMerkleDistributionRepository {
  constructor(private db: Pool) {}

  async findById(id: number): Promise<MerkleDistribution | null> {
    const result = await this.db.query<MerkleDistribution>('SELECT * FROM merkle_distribution WHERE distribution_id = $1', [id]);
    return result.rows[0] || null;
  }

  async create(distribution: Omit<MerkleDistribution, 'distribution_id' | 'created_at'>): Promise<MerkleDistribution> {
    const result = await this.db.query<MerkleDistribution>(
      'INSERT INTO merkle_distribution(merkle_root, distribution_name, is_active) VALUES($1, $2, $3) RETURNING *'
      , [distribution.merkle_root, distribution.distribution_name, distribution.is_active]
    );
    return result.rows[0];
  }

  async update(id: number, distribution: Partial<MerkleDistribution>): Promise<MerkleDistribution | null> {
    const fields = Object.keys(distribution).map((key, index) => `"${key}" = $${index + 2}`).join(', ');
    const values = Object.values(distribution);
    if (fields.length === 0) return this.findById(id); // No fields to update

    const result = await this.db.query<MerkleDistribution>(
      `UPDATE merkle_distribution SET ${fields} WHERE distribution_id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.query('DELETE FROM merkle_distribution WHERE distribution_id = $1', [id]);
    return result.rowCount > 0;
  }

  async findActive(): Promise<MerkleDistribution | null> {
    const result = await this.db.query<MerkleDistribution>('SELECT * FROM merkle_distribution WHERE is_active = TRUE LIMIT 1');
    return result.rows[0] || null;
  }
}