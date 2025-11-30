import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function initDB() {
  const dbPath = path.join(__dirname, '../database.sqlite');
  
  db = await open({
    filename: dbPath,
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS recordings (
      id TEXT PRIMARY KEY,
      trajectory_path TEXT,
      audio_path TEXT,
      created_at INTEGER
    )
  `);

  console.log('Database initialized');
  return db;
}

export async function getDB() {
  if (!db) {
    await initDB();
  }
  return db!;
}
