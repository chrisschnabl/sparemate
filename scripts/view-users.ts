import { getAllUsers, getActiveUsers } from '../lib/db';

console.log('\n=== All Users ===\n');
const allUsers = getAllUsers();
if (allUsers.length === 0) {
  console.log('No users in database yet.');
} else {
  allUsers.forEach((user) => {
    console.log(`ID: ${user.id}`);
    console.log(`Email: ${user.email}`);
    console.log(`Status: ${user.subscription_status || 'N/A'}`);
    console.log(`Customer ID: ${user.stripe_customer_id || 'N/A'}`);
    console.log(`Created: ${user.created_at}`);
    console.log('---');
  });
}

console.log('\n=== Active Subscribers ===\n');
const activeUsers = getActiveUsers();
if (activeUsers.length === 0) {
  console.log('No active subscribers yet.');
} else {
  activeUsers.forEach((user) => {
    console.log(`${user.email} (ID: ${user.id})`);
  });
}

console.log(`\nTotal users: ${allUsers.length}`);
console.log(`Active subscribers: ${activeUsers.length}\n`);
