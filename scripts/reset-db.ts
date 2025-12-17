
import { Pool } from 'pg';
import { loadEnvConfig } from '@next/env';
import { cwd } from 'node:process';

loadEnvConfig(cwd()); // Load env vars

const pool = new Pool({
  connectionString: process.env.POSTGRES_URL,
});

async function resetDb() {
  const client = await pool.connect();
  try {
    console.log('Dropping public schema...');
    await client.query('DROP SCHEMA public CASCADE;');
    await client.query('CREATE SCHEMA public;');
    await client.query('GRANT ALL ON SCHEMA public TO public;');
    console.log('Public schema reset.');
  } catch (err) {
    console.error('Error resetting DB:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

resetDb();
