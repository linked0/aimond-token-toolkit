import { User } from '../models/User';
import { Allocation } from '../models/Allocation';
import { Claim } from '../models/Claim';
import { MerkleDistribution } from '../models/MerkleDistribution';
import { MerkleProof } from '../models/MerkleProof';

export interface IUserRepository {
  findById(id: number): Promise<User | null>;
  findByWalletAddress(walletAddress: string): Promise<User | null>;
  create(user: Omit<User, 'user_id' | 'created_at'>): Promise<User>;
  update(id: number, user: Partial<User>): Promise<User | null>;
  delete(id: number): Promise<boolean>;
  findAll(): Promise<User[]>;
  getTotalPaidMemberCount(): Promise<number>;
}

export interface IAllocationRepository {
  findById(id: number): Promise<Allocation | null>;
  create(allocation: Omit<Allocation, 'allocation_id' | 'created_at'>): Promise<Allocation>;
  update(id: number, allocation: Partial<Allocation>): Promise<Allocation | null>;
  delete(id: number): Promise<boolean>;
  findByUserId(userId: number): Promise<Allocation[]>;
  findByClaimId(claimId: number): Promise<Allocation[]>;
}

export interface IClaimRepository {
  findById(id: number): Promise<Claim | null>;
  create(claim: Omit<Claim, 'claim_id' | 'created_at'>): Promise<Claim>;
  update(id: number, claim: Partial<Claim>): Promise<Claim | null>;
  delete(id: number): Promise<boolean>;
  findByUserId(userId: number): Promise<Claim[]>;
  findByTransactionHash(transactionHash: string): Promise<Claim | null>;
}

export interface IMerkleDistributionRepository {
  findById(id: number): Promise<MerkleDistribution | null>;
  create(distribution: Omit<MerkleDistribution, 'distribution_id' | 'created_at'>): Promise<MerkleDistribution>;
  update(id: number, distribution: Partial<MerkleDistribution>): Promise<MerkleDistribution | null>;
  delete(id: number): Promise<boolean>;
  findActive(): Promise<MerkleDistribution | null>;
}

export interface IMerkleProofRepository {
  findById(id: number): Promise<MerkleProof | null>;
  create(proof: Omit<MerkleProof, 'proof_id'>): Promise<MerkleProof>;
  update(id: number, proof: Partial<MerkleProof>): Promise<MerkleProof | null>;
  delete(id: number): Promise<boolean>;
  findByDistributionAndUser(distributionId: number, userId: number): Promise<MerkleProof | null>;
  findByUserId(userId: number): Promise<MerkleProof[]>;
}
