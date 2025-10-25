import { config } from 'dotenv';
import { query } from '../lib/db';

// Load environment variables
config({ path: '.env.local' });

async function addEmailToggle() {
  console.log('📧 Adding email toggle column...\n');

  try {
    // Add emails_enabled column if it doesn't exist
    await query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS emails_enabled BOOLEAN DEFAULT TRUE;
    `);

    console.log('✅ Successfully added emails_enabled column to users table');
    console.log('   Default value: TRUE (emails enabled for all users)\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

addEmailToggle();
