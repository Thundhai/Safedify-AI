import { Pool } from 'pg';

const pool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'safedify_user',
  password: process.env.PG_PASSWORD || 'safedify_pass',
  database: process.env.PG_DATABASE || 'safedify',
});

export default pool;

// Example usage:
// const result = await pool.query('SELECT NOW()');
// console.log(result.rows);