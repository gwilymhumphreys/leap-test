import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Prompts data access', () => {
  beforeEach(() => {
    // Use in-memory database for each test
    process.env.SQLITE_PATH = ':memory:';
  });

  afterEach(async () => {
    // Reset database state
    const { resetDatabase } = await import('../lib/db.js');
    resetDatabase();
    delete process.env.SQLITE_PATH;
  });

  it('should return null when no prompt exists', async () => {
    const { getLatestPrompt } = await import('../lib/prompts.js');
    const prompt = await getLatestPrompt();
    expect(prompt).toBeNull();
  });

  it('should upsert prompt with id=1 and proper timestamps', async () => {
    const { getLatestPrompt, upsertPrompt } = await import('../lib/prompts.js');
    
    // Insert new prompt
    const prompt1 = await upsertPrompt('First prompt');
    expect(prompt1.id).toBe(1);
    expect(prompt1.text).toBe('First prompt');
    expect(prompt1.createdAt).toBeTypeOf('number');
    expect(prompt1.updatedAt).toBeTypeOf('number');
    expect(prompt1.createdAt).toBe(prompt1.updatedAt);
    
    // Small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Update existing prompt
    const prompt2 = await upsertPrompt('Updated prompt');
    expect(prompt2.id).toBe(1);
    expect(prompt2.text).toBe('Updated prompt');
    expect(prompt2.createdAt).toBe(prompt1.createdAt); // createdAt should not change
    expect(prompt2.updatedAt).toBeGreaterThan(prompt1.updatedAt); // updatedAt should change
    
    // Verify getLatestPrompt returns the updated one
    const latest = await getLatestPrompt();
    expect(latest).toEqual(prompt2);
  });
});