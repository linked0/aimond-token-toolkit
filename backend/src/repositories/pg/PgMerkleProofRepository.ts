import { Pool } from 'pg';
import { IMerkleProofRepository } from '../interfaces';
import { MerkleProof } from '../../models/MerkleProof';
import pool from '../../database/db';

export class PgMerkleProofRepository implements IMerkleProofRepository {
  constructor(private db: Pool) {}

  async findById(id: number): Promise<MerkleProof | null> {
    const result = await this.db.query<MerkleProof>('SELECT * FROM merkle_proof WHERE proof_id = $1', [id]);
    return result.rows[0] || null;
  }

  async create(proof: Omit<MerkleProof, 'proof_id'>): Promise<MerkleProof> {
    const result = await this.db.query<MerkleProof>(
      'INSERT INTO merkle_proof(distribution_id, user_id, amount, proof) VALUES($1, $2, $3, $4) RETURNING *'
      , [proof.distribution_id, proof.user_id, proof.amount, JSON.stringify(proof.proof)] // Store proof as JSON string
    );
    return result.rows[0];
  }

  async update(id: number, proof: Partial<MerkleProof>): Promise<MerkleProof | null> {
    const fields = Object.keys(proof).map((key, index) => `"${key}" = $${index + 2}`).join(', ');
    const values = Object.values(proof);
    if (fields.length === 0) return this.findById(id); // No fields to update

    const result = await this.db.query<MerkleProof>(
      `UPDATE merkle_proof SET ${fields} WHERE proof_id = $1 RETURNING *`,
      [id, ...values]
    );
    return result.rows[0] || null;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.db.query('DELETE FROM merkle_proof WHERE proof_id = $1', [id]);
    return result.rowCount > 0;
  }

  async findByDistributionAndUser(distributionId: number, userId: number): Promise<MerkleProof | null> {
    const result = await this.db.query<MerkleProof>(
      'SELECT * FROM merkle_proof WHERE distribution_id = $1 AND user_id = $2',
      [distributionId, userId]
    );
    return result.rows[0] || null;
  }

  async findByUserId(userId: number): Promise<MerkleProof[]> {
    const result = await this.db.query<MerkleProof>('SELECT * FROM merkle_proof WHERE user_id = $1', [userId]);
    return result.rows;
  }
}