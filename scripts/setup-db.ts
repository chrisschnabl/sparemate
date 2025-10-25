import { config } from 'dotenv';
import { pool, query } from '../lib/db';

// Load environment variables from .env.local
config({ path: '.env.local' });

async function setupDatabase() {
  console.log('🔧 Setting up Supabase Postgres database...\n');

  // Debug: Show connection string (without password)
  const connStr = process.env.POSTGRES_URL || 'NOT SET';
  const safeConnStr = connStr.replace(/:([^@]+)@/, ':****@');
  console.log(`📝 Connection string: ${safeConnStr}\n`);

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    console.log('✅ Database connection successful!\n');

    // Create users table
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        spareroom_url TEXT,
        stripe_customer_id VARCHAR(255) UNIQUE,
        stripe_subscription_id VARCHAR(255),
        subscription_status VARCHAR(50),
        last_checked_ad_id VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Table "users" created/verified with schema:');
    console.log('   - id (PRIMARY KEY)');
    console.log('   - email (UNIQUE, NOT NULL)');
    console.log('   - spareroom_url');
    console.log('   - stripe_customer_id (UNIQUE)');
    console.log('   - stripe_subscription_id');
    console.log('   - subscription_status');
    console.log('   - last_checked_ad_id');
    console.log('   - created_at');
    console.log('   - updated_at\n');

    // Create pending_urls table
    await query(`
      CREATE TABLE IF NOT EXISTS pending_urls (
        url_id VARCHAR(255) PRIMARY KEY,
        spareroom_url TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log('✅ Table "pending_urls" created/verified\n');

    // Create indexes
    await query('CREATE INDEX IF NOT EXISTS idx_stripe_customer_id ON users(stripe_customer_id)');
    await query('CREATE INDEX IF NOT EXISTS idx_subscription_status ON users(subscription_status)');

    console.log('✅ Indexes created for better query performance\n');

    // Test query to verify database is working
    const result = await query('SELECT COUNT(*) as count FROM users');
    const count = result.rows[0].count;

    console.log('✅ Database is ready and working!\n');
    console.log(`📊 Current users in database: ${count}\n`);

    // Show all users if any exist
    if (parseInt(count) > 0) {
      const users = await query('SELECT id, email, spareroom_url, subscription_status, created_at FROM users ORDER BY created_at DESC');
      console.log('Current users:');
      console.table(users.rows);
    }

    console.log('✅ Setup complete!');

    // Close the pool
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up database:', error);
    await pool.end();
    process.exit(1);
  }
}

setupDatabase();
