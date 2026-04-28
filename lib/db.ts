/**
 * MySQL Database Connection Pool
 *
 * Uses mysql2/promise for async query support with connection pooling.
 * Uses pool.query() which handles parameterized queries safely while
 * supporting LIMIT/OFFSET integer params correctly.
 */

import mysql, { type ResultSetHeader } from 'mysql2/promise'

const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'CHhg(&*865cc',
  database: process.env.DB_NAME || 'store_db',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 5,
  idleTimeout: 60000,
  queueLimit: 0,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0,
})

export default pool

/**
 * Execute a parameterized query (safe from SQL injection).
 * Uses pool.query() which correctly handles LIMIT/OFFSET params.
 */
export async function query<T = unknown>(
  sql: string,
  params: any[] = []
): Promise<T[]> {
  const [rows] = await pool.query(sql, params)
  return rows as T[]
}

/**
 * Execute a single-row query
 */
export async function queryOne<T = unknown>(
  sql: string,
  params: any[] = []
): Promise<T | null> {
  const rows = await query<T>(sql, params)
  return rows[0] ?? null
}

/**
 * Execute an INSERT and return the insertId
 */
export async function insert(
  sql: string,
  params: any[] = []
): Promise<number> {
  const [result] = await pool.query(sql, params)
  return (result as ResultSetHeader).insertId
}

/**
 * Execute an UPDATE/DELETE and return affectedRows
 */
export async function execute(
  sql: string,
  params: any[] = []
): Promise<number> {
  const [result] = await pool.query(sql, params)
  return (result as ResultSetHeader).affectedRows
}

/**
 * Health check — verify DB connection is alive
 */
export async function checkConnection(): Promise<boolean> {
  try {
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}
