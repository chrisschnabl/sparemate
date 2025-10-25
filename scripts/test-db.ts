import { config } from 'dotenv';
import {
  createUser,
  getUserByEmail,
  updateUserSubscription,
  getActiveUsers,
  updateLastCheckedAdId,
  query,
  pool
} from '../lib/db';

// Load environment variables
config({ path: '.env.local' });

async function testDatabase() {
  console.log('🧪 Testing Database Component...\n');

  try {
    // Test 1: Create a test user
    console.log('1️⃣  Testing createUser()...');
    const testEmail = `test-${Date.now()}@example.com`;
    const testCustomerId = `cus_test_${Date.now()}`;
    const testUrl = 'https://www.spareroom.co.uk/flatshare/test123';

    const user = await createUser(testEmail, testCustomerId, testUrl);
    console.log('   ✅ User created:', {
      id: user.id,
      email: user.email,
      spareroomUrl: user.spareroom_url,
    });

    // Test 2: Get user by email
    console.log('\n2️⃣  Testing getUserByEmail()...');
    const fetchedUser = await getUserByEmail(testEmail);
    if (fetchedUser && fetchedUser.email === testEmail) {
      console.log('   ✅ User fetched successfully');
    } else {
      throw new Error('User fetch failed');
    }

    // Test 3: Update subscription
    console.log('\n3️⃣  Testing updateUserSubscription()...');
    await updateUserSubscription(testCustomerId, 'sub_test_123', 'active');
    const updatedUser = await getUserByEmail(testEmail);
    if (updatedUser?.subscription_status === 'active') {
      console.log('   ✅ Subscription updated successfully');
    } else {
      throw new Error('Subscription update failed');
    }

    // Test 4: Get active users
    console.log('\n4️⃣  Testing getActiveUsers()...');
    const activeUsers = await getActiveUsers();
    if (activeUsers.some((u) => u.email === testEmail)) {
      console.log(`   ✅ Found ${activeUsers.length} active user(s)`);
    } else {
      throw new Error('Active users query failed');
    }

    // Test 5: Update last checked ad ID
    console.log('\n5️⃣  Testing updateLastCheckedAdId()...');
    await updateLastCheckedAdId(user.id, '12345678');
    const userWithAdId = await getUserByEmail(testEmail);
    if (userWithAdId?.last_checked_ad_id === '12345678') {
      console.log('   ✅ Last checked ad ID updated successfully');
    } else {
      throw new Error('Last checked ad ID update failed');
    }

    // Test 6: Clean up - delete test user
    console.log('\n6️⃣  Cleaning up test data...');
    await query('DELETE FROM users WHERE email = $1', [testEmail]);
    const deletedUser = await getUserByEmail(testEmail);
    if (!deletedUser) {
      console.log('   ✅ Test data cleaned up successfully');
    } else {
      throw new Error('Cleanup failed');
    }

    console.log('\n✅ All database tests passed!\n');
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Database test failed:', error);
    await pool.end();
    process.exit(1);
  }
}

testDatabase();
