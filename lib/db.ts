import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'users.db');
const db = new Database(dbPath);

// Create users table if it doesn't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    spareroom_url TEXT,
    stripe_customer_id TEXT UNIQUE,
    stripe_subscription_id TEXT,
    subscription_status TEXT,
    last_checked_ad_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export interface User {
  id: number;
  email: string;
  spareroom_url: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  last_checked_ad_id: string | null;
  created_at: string;
  updated_at: string;
}

export function createUser(email: string, stripeCustomerId: string, spareroomUrl?: string): User {
  const stmt = db.prepare(`
    INSERT INTO users (email, stripe_customer_id, spareroom_url, subscription_status)
    VALUES (?, ?, ?, 'active')
  `);
  const result = stmt.run(email, stripeCustomerId, spareroomUrl || null);
  return getUserById(result.lastInsertRowid as number)!;
}

export function updateUserSubscription(
  stripeCustomerId: string,
  subscriptionId: string,
  status: string
): void {
  const stmt = db.prepare(`
    UPDATE users
    SET stripe_subscription_id = ?,
        subscription_status = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE stripe_customer_id = ?
  `);
  stmt.run(subscriptionId, status, stripeCustomerId);
}

export function getUserById(id: number): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
  return stmt.get(id) as User | undefined;
}

export function getUserByEmail(email: string): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email) as User | undefined;
}

export function getUserByStripeCustomerId(customerId: string): User | undefined {
  const stmt = db.prepare('SELECT * FROM users WHERE stripe_customer_id = ?');
  return stmt.get(customerId) as User | undefined;
}

export function getActiveUsers(): User[] {
  const stmt = db.prepare(`
    SELECT * FROM users
    WHERE subscription_status = 'active'
    ORDER BY created_at DESC
  `);
  return stmt.all() as User[];
}

export function getAllUsers(): User[] {
  const stmt = db.prepare('SELECT * FROM users ORDER BY created_at DESC');
  return stmt.all() as User[];
}

export function updateLastCheckedAdId(userId: number, adId: string): void {
  const stmt = db.prepare(`
    UPDATE users
    SET last_checked_ad_id = ?,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `);
  stmt.run(adId, userId);
}

export default db;
