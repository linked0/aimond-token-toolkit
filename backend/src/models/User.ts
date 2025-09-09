export interface User {
  user_id: number;
  wallet_address: string;
  referrer_id?: number | null; // FOREIGN KEY, can be null
  total_spending_for_amd_allocation: string;
  total_spent_money: string;
  is_paid_member: boolean;
  paid_member_tier?: number | null;
  created_at: Date;
}
