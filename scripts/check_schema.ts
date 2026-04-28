
import { query } from '../lib/db';

async function main() {
  try {
    const stores = await query('SHOW COLUMNS FROM stores');
    console.log('Stores Columns:', JSON.stringify(stores, null, 2));

    const plans = await query('SHOW COLUMNS FROM plans');
    console.log('Plans Columns:', JSON.stringify(plans, null, 2));

    const subs = await query('SHOW COLUMNS FROM subscriptions');
    console.log('Subscriptions Columns:', JSON.stringify(subs, null, 2));
    
    const users = await query('SHOW COLUMNS FROM users');
    console.log('Users Columns:', JSON.stringify(users, null, 2));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit();
  }
}

main();
