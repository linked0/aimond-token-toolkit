export interface User {
  user_id: number;
  wallet_address: string;
  referrer_id?: number | null; // FOREIGN KEY, can be null
  created_at: Date;
}
