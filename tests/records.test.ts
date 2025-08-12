import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('Records data access', () => {
  let testId: string;
  
  beforeEach(() => {
    // Use in-memory database with unique name for each test
    testId = Math.random().toString(36).substring(7);
    process.env.SQLITE_PATH = `:memory:`;
  });

  afterEach(async () => {
    // Reset database state
    const { resetDatabase } = await import('../lib/db.js');
    resetDatabase();
    delete process.env.SQLITE_PATH;
  });

  it('should list empty records initially', async () => {
    const { listRecords } = await import('../lib/records.js');
    const records = await listRecords();
    expect(records).toEqual([]);
  });

  it('should create record with proper timestamps', async () => {
    const { createRecord } = await import('../lib/records.js');
    
    const record = await createRecord({
      title: 'Test Title',
      description: 'Test Description'
    });
    
    expect(record.id).toBeTypeOf('number');
    expect(record.title).toBe('Test Title');
    expect(record.description).toBe('Test Description');
    expect(record.createdAt).toBeTypeOf('number');
    expect(record.updatedAt).toBeTypeOf('number');
    expect(record.createdAt).toBe(record.updatedAt);
  });

  it('should list created records', async () => {
    const { listRecords, createRecord } = await import('../lib/records.js');
    
    await createRecord({ title: 'Record 1', description: 'Description 1' });
    await createRecord({ title: 'Record 2', description: 'Description 2' });
    
    const records = await listRecords();
    expect(records).toHaveLength(2);
    expect(records[0].title).toBe('Record 1');
    expect(records[1].title).toBe('Record 2');
  });

  it('should update record with patch semantics', async () => {
    const { createRecord, updateRecord } = await import('../lib/records.js');
    
    const original = await createRecord({
      title: 'Original Title',
      description: 'Original Description'
    });
    
    // Small delay to ensure timestamp difference
    await new Promise(resolve => setTimeout(resolve, 10));
    
    // Update only title
    const updated = await updateRecord(original.id, {
      title: 'Updated Title'
    });
    
    expect(updated.id).toBe(original.id);
    expect(updated.title).toBe('Updated Title');
    expect(updated.description).toBe('Original Description'); // unchanged
    expect(updated.createdAt).toBe(original.createdAt); // unchanged
    expect(updated.updatedAt).toBeGreaterThan(original.updatedAt); // changed
  });

  it('should throw error when updating non-existent record', async () => {
    const { updateRecord } = await import('../lib/records.js');
    
    await expect(updateRecord(999, { title: 'Test' })).rejects.toThrow('Record with id 999 not found');
  });

  it('should delete record', async () => {
    const { createRecord, deleteRecord, listRecords } = await import('../lib/records.js');
    
    const record = await createRecord({
      title: 'To Delete',
      description: 'Will be deleted'
    });
    
    await deleteRecord(record.id);
    
    const records = await listRecords();
    expect(records).toHaveLength(0);
  });

  it('should throw error when deleting non-existent record', async () => {
    const { deleteRecord } = await import('../lib/records.js');
    
    await expect(deleteRecord(999)).rejects.toThrow('Record with id 999 not found');
  });

  it('should truncate all records', async () => {
    const { createRecord, truncateRecords, listRecords } = await import('../lib/records.js');
    
    await createRecord({ title: 'Record 1', description: 'Description 1' });
    await createRecord({ title: 'Record 2', description: 'Description 2' });
    await createRecord({ title: 'Record 3', description: 'Description 3' });
    
    let records = await listRecords();
    expect(records).toHaveLength(3);
    
    await truncateRecords();
    
    records = await listRecords();
    expect(records).toHaveLength(0);
  });
});