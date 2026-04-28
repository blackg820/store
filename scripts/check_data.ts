
import { query } from '../lib/db';

async function main() {
  try {
    const users = await query('SELECT id, name, email, role, status FROM users');
    console.log('Users:', JSON.stringify(users, null, 2));

    const subs = await query('SELECT * FROM subscriptions');
    console.log('Subscriptions:', JSON.stringify(subs, null, 2));
    
    const plans = await query('SELECT * FROM plans');
    console.log('Plans:', JSON.stringify(plans, null, 2));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit();
  }
}

main();
