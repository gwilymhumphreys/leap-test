import { systemPrompts } from './systemPrompts';

// Just use the first prompt in the list
export function getSystemPromptText(): string {
  return systemPrompts[0].prompt;
}

export function getModel(): string {
  const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "";
  return OPENAI_MODEL || systemPrompts[0].model;
}
