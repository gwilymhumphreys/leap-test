import Database from 'better-sqlite3';
import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { SQLITE_PATH } from './consts';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

let _sqlite: Database.Database | null = null;
let _db: BetterSQLite3Database | null = null;

// Create tables if they don't exist (fast path migration)
const initializeSchema = (database: BetterSQLite3Database) => {
  // Create prompts table
  database.run(`
    CREATE TABLE IF NOT EXISTS prompts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);

  // Create records table
  database.run(`
    CREATE TABLE IF NOT EXISTS records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
};

function createDatabase() {
  const dbPath = SQLITE_PATH;

  // Ensure the directory exists for the database file (unless using :memory:)
  if (dbPath !== ':memory:') {
    const dbDir = dirname(dbPath);
    mkdirSync(dbDir, { recursive: true });
  }

  // Initialize SQLite database
  const sqlite = new Database(dbPath);

  // Enable foreign keys and WAL mode for better performance
  sqlite.pragma('foreign_keys = ON');
  if (dbPath !== ':memory:') {
    sqlite.pragma('journal_mode = WAL');
  }

  // Create Drizzle instance
  const db = drizzle(sqlite);

  // Initialize schema
  initializeSchema(db);

  return { sqlite, db };
}

function getDatabase() {
  if (!_sqlite || !_db) {
    const { sqlite, db } = createDatabase();
    _sqlite = sqlite;
    _db = db;
  }
  return { sqlite: _sqlite, db: _db };
}

// Export getter functions
export const db = new Proxy({} as BetterSQLite3Database, {
  get(target, prop) {
    const { db } = getDatabase();
    return db[prop as keyof BetterSQLite3Database];
  }
});

export const sqlite = new Proxy({} as Database.Database, {
  get(target, prop) {
    const { sqlite } = getDatabase();
    return sqlite[prop as keyof Database.Database];
  }
});

// Export function to reset database (for testing)
export function resetDatabase() {
  if (_sqlite) {
    _sqlite.close();
  }
  _sqlite = null;
  _db = null;
}

// Export function to gracefully close database connection
export function closeDatabase() {
  if (_sqlite) {
    _sqlite.close();
    _sqlite = null;
    _db = null;
  }
}