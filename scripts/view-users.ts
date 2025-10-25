import { getAllUsers, getActiveUsers } from '../lib/db';

async function viewUsers() {
  console.log('\n=== All Users ===\n');
  const allUsers = await getAllUsers();
  if (allUsers.length === 0) {
    console.log('No users in database yet.');
  } else {
    allUsers.forEach((user) => {
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${user.email}`);
      console.log(`Spareroom URL: ${user.spareroom_url || 'Not set'}`);
      console.log(`Status: ${user.subscription_status || 'N/A'}`);
      console.log(`Customer ID: ${user.stripe_customer_id || 'N/A'}`);
      console.log(`Last Checked Ad: ${user.last_checked_ad_id || 'None'}`);
      console.log(`Created: ${user.created_at}`);
      console.log('---');
    });
  }

  console.log('\n=== Active Subscribers ===\n');
  const activeUsers = await getActiveUsers();
  if (activeUsers.length === 0) {
    console.log('No active subscribers yet.');
  } else {
    activeUsers.forEach((user) => {
      console.log(`${user.email} (ID: ${user.id})`);
    });
  }

  console.log(`\nTotal users: ${allUsers.length}`);
  console.log(`Active subscribers: ${activeUsers.length}\n`);
}

viewUsers();
