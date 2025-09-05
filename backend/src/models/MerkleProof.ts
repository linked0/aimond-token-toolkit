export interface MerkleProof {
  proof_id: number;
  distribution_id: number;
  user_id: number;
  amount: string; // Use string for DECIMAL to maintain precision
  proof: string[]; // Array of hash values
}
