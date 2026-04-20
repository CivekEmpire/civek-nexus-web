// CIVEK NEXUS - Database Setup Script
// Executes schema creation for Sprint 16

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';

async function setupDatabase() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    console.log('🔗 Connecting to database...');

    // Read SQL file
    const sqlPath = path.join(__dirname, 'create-schema.sql');
    const sql = fs.readFileSync(sqlPath, 'utf-8');

    console.log('📝 Executing schema...');
    await pool.query(sql);

    console.log('✅ Schema created successfully!');

    // Verify tables exist
    const result = await pool.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'user_circles'
    `);

    if (result.rows.length > 0) {
      console.log('✅ Table user_circles verified');

      // Count rows
      const count = await pool.query('SELECT COUNT(*) FROM user_circles');
      console.log(`📊 Total rows: ${count.rows[0].count}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

setupDatabase();
