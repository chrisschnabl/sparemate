import { Pool } from 'pg';
import { config } from 'dotenv';

// Load environment variables (for local development and scripts)
// This will be a no-op in production/Vercel where env vars are already set
if (!process.env.POSTGRES_URL) {
  config({ path: '.env.local' });
}

// Create a connection pool
// For Supabase, we need to handle SSL properly
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
  ssl: process.env.POSTGRES_URL?.includes('supabase.com')
    ? { rejectUnauthorized: false }
    : false,
});

export interface User {
  id: number;
  email: string;
  spareroom_url: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  last_checked_ad_id: string | null;
  emails_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export async function createUser(email: string, stripeCustomerId: string, spareroomUrl?: string): Promise<User> {
  const result = await pool.query(
    `INSERT INTO users (email, stripe_customer_id, spareroom_url, subscription_status)
     VALUES ($1, $2, $3, 'trialing')
     RETURNING *`,
    [email, stripeCustomerId, spareroomUrl || null]
  );
  return result.rows[0] as User;
}

export async function updateUserSubscription(
  stripeCustomerId: string,
  subscriptionId: string,
  status: string
): Promise<void> {
  await pool.query(
    `UPDATE users
     SET stripe_subscription_id = $1,
         subscription_status = $2,
         updated_at = CURRENT_TIMESTAMP
     WHERE stripe_customer_id = $3`,
    [subscriptionId, status, stripeCustomerId]
  );
}

export async function updateUserSpareroomUrl(
  stripeCustomerId: string,
  spareroomUrl: string
): Promise<void> {
  await pool.query(
    `UPDATE users
     SET spareroom_url = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE stripe_customer_id = $2`,
    [spareroomUrl, stripeCustomerId]
  );
}

export async function getUserById(id: number): Promise<User | undefined> {
  const result = await pool.query('SELECT * FROM users WHERE id = $1', [id]);
  return result.rows[0] as User | undefined;
}

export async function getUserByEmail(email: string): Promise<User | undefined> {
  const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
  return result.rows[0] as User | undefined;
}

export async function getUserByStripeCustomerId(customerId: string): Promise<User | undefined> {
  const result = await pool.query('SELECT * FROM users WHERE stripe_customer_id = $1', [customerId]);
  return result.rows[0] as User | undefined;
}

export async function getActiveUsers(): Promise<User[]> {
  const result = await pool.query(
    `SELECT * FROM users
     WHERE subscription_status IN ('active', 'trialing')
       AND emails_enabled = TRUE
     ORDER BY created_at DESC`
  );
  return result.rows as User[];
}

export async function getAllUsers(): Promise<User[]> {
  const result = await pool.query('SELECT * FROM users ORDER BY created_at DESC');
  return result.rows as User[];
}

export async function updateLastCheckedAdId(userId: number, adId: string): Promise<void> {
  await pool.query(
    `UPDATE users
     SET last_checked_ad_id = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE id = $2`,
    [adId, userId]
  );
}

export async function toggleEmailNotifications(stripeCustomerId: string, enabled: boolean): Promise<void> {
  await pool.query(
    `UPDATE users
     SET emails_enabled = $1,
         updated_at = CURRENT_TIMESTAMP
     WHERE stripe_customer_id = $2`,
    [enabled, stripeCustomerId]
  );
}

export async function getUsersBySpareroomUrl(spareroomUrl: string): Promise<User[]> {
  const result = await pool.query(
    'SELECT * FROM users WHERE spareroom_url = $1 ORDER BY created_at DESC',
    [spareroomUrl]
  );
  return result.rows as User[];
}

// Helper function to execute raw SQL queries
export async function query(text: string, params?: any[]) {
  return pool.query(text, params);
}

// Export pool for direct access if needed
export { pool };
