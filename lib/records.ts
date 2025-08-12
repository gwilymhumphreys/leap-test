import { eq } from 'drizzle-orm';
import { db } from './db';
import { records, type Record } from './schema';
import { nowMs } from './time';

export async function listRecords(): Promise<Record[]> {
  return await db.select().from(records).all();
}

export async function createRecord({
  title,
  description
}: {
  title: string;
  description: string;
}): Promise<Record> {
  const now = nowMs();
  const inserted = await db
    .insert(records)
    .values({
      title,
      description,
      createdAt: now,
      updatedAt: now,
    })
    .returning();
  return inserted[0];
}

export async function updateRecord(
  id: number,
  partial: { title?: string; description?: string }
): Promise<Record> {
  const now = nowMs();
  const updated = await db
    .update(records)
    .set({
      ...partial,
      updatedAt: now,
    })
    .where(eq(records.id, id))
    .returning();
  
  if (updated.length === 0) {
    throw new Error(`Record with id ${id} not found`);
  }
  
  return updated[0];
}

export async function deleteRecord(id: number): Promise<void> {
  const result = await db.delete(records).where(eq(records.id, id));
  if (result.changes === 0) {
    throw new Error(`Record with id ${id} not found`);
  }
}

export async function truncateRecords(): Promise<void> {
  await db.delete(records);
}