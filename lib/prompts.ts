import { eq } from 'drizzle-orm';
import { db } from './db';
import { prompts, type Prompt } from './schema';
import { nowMs } from './time';

export async function getLatestPrompt(): Promise<Prompt | null> {
  const result = await db.select().from(prompts).where(eq(prompts.id, 1)).limit(1);
  return result[0] || null;
}

export async function upsertPrompt(text: string): Promise<Prompt> {
  const now = nowMs();
  const existing = await getLatestPrompt();
  
  if (existing) {
    // Update existing prompt
    const updated = await db
      .update(prompts)
      .set({
        text,
        updatedAt: now,
      })
      .where(eq(prompts.id, 1))
      .returning();
    return updated[0];
  } else {
    // Insert new prompt with id = 1
    const inserted = await db
      .insert(prompts)
      .values({
        id: 1,
        text,
        createdAt: now,
        updatedAt: now,
      })
      .returning();
    return inserted[0];
  }
}