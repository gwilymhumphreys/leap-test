import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { unlinkSync } from 'fs';
import { join } from 'path';

describe('Database initialization', () => {
  const testDbPath = join(process.cwd(), '.tmp', 'test.db');
  
  beforeEach(() => {
    // Set test database path
    process.env.SQLITE_PATH = testDbPath;
  });

  afterEach(() => {
    // Clean up
    try {
      unlinkSync(testDbPath);
      unlinkSync(testDbPath + '-shm');
      unlinkSync(testDbPath + '-wal');
    } catch (err) {
      // Files may not exist, ignore
    }
    delete process.env.SQLITE_PATH;
  });

  it('should create database and tables successfully', async () => {
    // Import db after setting test path
    const { db, sqlite } = await import('../lib/db.js');
    
    // Check that tables exist
    const tables = db.all(`
      SELECT name FROM sqlite_master 
      WHERE type='table' AND name IN ('prompts', 'records')
    `);
    
    expect(tables).toHaveLength(2);
    expect(tables.map(t => t.name)).toContain('prompts');
    expect(tables.map(t => t.name)).toContain('records');
    
    // Close the database connection
    sqlite.close();
  });
});