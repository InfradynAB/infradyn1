// Quick migration script — adds tours_seen column to the user table
// Run with: npx tsx scripts/migrate-tours-seen.ts

import { loadEnvConfig } from '@next/env';
import { cwd } from 'node:process';

loadEnvConfig(cwd());

import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function main() {
    const client = await pool.connect();
    try {
        await client.query(`
            ALTER TABLE "user"
            ADD COLUMN IF NOT EXISTS tours_seen jsonb DEFAULT '{}'::jsonb;
        `);
        console.log('✅  tours_seen column added (or already exists).');
    } finally {
        client.release();
        await pool.end();
    }
}

main().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
});
