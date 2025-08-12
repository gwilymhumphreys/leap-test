import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export const prompts = sqliteTable('prompts', {
  id: integer('id').primaryKey(),
  text: text('text').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export const records = sqliteTable('records', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull(),
  description: text('description').notNull(),
  createdAt: integer('created_at').notNull(),
  updatedAt: integer('updated_at').notNull(),
});

export type Prompt = typeof prompts.$inferSelect;
export type Record = typeof records.$inferSelect;
export type NewPrompt = typeof prompts.$inferInsert;
export type NewRecord = typeof records.$inferInsert;