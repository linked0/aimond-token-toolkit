export type AllocationType = 'SPENDING_REWARD' | 'REFERRAL_REWARD' | 'AIRDROP';

export interface Allocation {
  allocation_id: number;
  user_id: number;
  amount: string; // Use string for DECIMAL to maintain precision
  type: AllocationType;
  source_info: string | null;
  is_claimed: boolean;
  claim_id: number | null; // FOREIGN KEY, can be null
  created_at: Date;
}
