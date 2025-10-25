-- Create users table for Vercel Postgres
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  spareroom_url TEXT,
  stripe_customer_id VARCHAR(255) UNIQUE,
  stripe_subscription_id VARCHAR(255),
  subscription_status VARCHAR(50),
  last_checked_ad_id VARCHAR(255),
  emails_enabled BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create index on stripe_customer_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_stripe_customer_id ON users(stripe_customer_id);

-- Create index on subscription_status for cron job queries
CREATE INDEX IF NOT EXISTS idx_subscription_status ON users(subscription_status);
