import { describe, it, expect, beforeEach, afterEach } from 'vitest';

describe('System prompt loading', () => {
  beforeEach(() => {
    delete process.env.OPENAI_MODEL;
  });

  afterEach(async () => {
    delete process.env.OPENAI_MODEL;
  });

  it('should load default system prompt configuration', async () => {
    const { getSystemPromptText, getModel } = await import('../lib/systemPrompt.js');
    expect(getSystemPromptText()).toBeTruthy();
    expect(getModel()).toBeTruthy();
  });

  it('should allow OPENAI_MODEL override', async () => {
    process.env.OPENAI_MODEL = 'gpt-4';

    const { getModel } = await import('../lib/systemPrompt.js');
    expect(getModel()).toBe('gpt-4');
  });
});