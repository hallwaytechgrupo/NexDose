import fs from 'fs';
import path from 'path';
import pool from './db';

async function migrate() {
  const distSqlPath = path.resolve(__dirname, 'init.sql');
  const sourceSqlPath = path.resolve(__dirname, '..', 'src', 'init.sql');
  const sqlPath = fs.existsSync(distSqlPath) ? distSqlPath : sourceSqlPath;
  const sql = fs.readFileSync(sqlPath, 'utf8');

  console.log(`[db] running migrations from ${sqlPath}`);
  await pool.query(sql);
  console.log('[db] migrations completed');
}

migrate()
  .catch((error) => {
    console.error('[db] migration failed');
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
