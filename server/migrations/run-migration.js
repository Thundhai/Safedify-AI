// Run migrations using the app's database connection
import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

const pool = new pg.Pool({
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  database: process.env.PG_DATABASE || 'safedify',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || '',
});

async function runMigration(filename) {
  const filePath = path.join(__dirname, filename);
  const sql = fs.readFileSync(filePath, 'utf-8');
  
  console.log(`Running migration: ${filename}`);
  
  try {
    await pool.query(sql);
    console.log(`✓ Migration completed successfully`);
  } catch (error) {
    console.error(`✗ Migration failed:`, error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run the FTS indexes migration
runMigration('001_add_fts_indexes.sql');
