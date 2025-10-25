import { config } from 'dotenv';
import { query } from '../lib/db';

// Load environment variables
config({ path: '.env.local' });

async function checkPendingUrls() {
  console.log('🔍 Checking pending URLs...\n');

  try {
    // Check if table exists
    const tableCheck = await query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'pending_urls'
      );
    `);

    if (!tableCheck.rows[0].exists) {
      console.log('❌ pending_urls table does not exist yet');
      console.log('   It will be created automatically when you first submit a URL\n');
      process.exit(0);
    }

    // Get all pending URLs
    const result = await query(`
      SELECT * FROM pending_urls
      ORDER BY created_at DESC;
    `);

    console.log(`✅ Found ${result.rows.length} pending URL(s):\n`);

    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. URL ID: ${row.url_id}`);
      console.log(`   Spareroom URL: ${row.spareroom_url}`);
      console.log(`   Created: ${row.created_at}\n`);
    });

    if (result.rows.length === 0) {
      console.log('💡 No pending URLs found. This is normal if you haven\'t submitted the form yet.\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkPendingUrls();
