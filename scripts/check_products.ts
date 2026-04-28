
import { query } from '../lib/db';

async function main() {
  try {
    const products = await query('SELECT id, title, media FROM products LIMIT 5');
    console.log('Products:', JSON.stringify(products, null, 2));
  } catch (e) {
    console.error('Error:', e);
  } finally {
    process.exit();
  }
}

main();
