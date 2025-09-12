export type ClaimStatus = 'PENDING' | 'SUCCESS' | 'FAILED';

export interface Claim {
  claim_id: number;
  user_id: number;
  amount: string; // The amount of tokens claimed in this specific claim
  total_claimed_amount: string; // Use string for DECIMAL to maintain precision
  transaction_hash: string;
  status: ClaimStatus;
  created_at: Date;
}
