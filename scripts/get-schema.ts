import pool from '../lib/db';
async function run() {
  const [rows] = await pool.query('DESCRIBE subscriptions');
  console.log(rows);
  const [planRows] = await pool.query('DESCRIBE plan_limits');
  console.log(planRows);
  process.exit(0);
}
run();
