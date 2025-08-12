import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, unlinkSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

describe('System prompt loading', () => {
  const configDir = join(process.cwd(), 'config');
  const configPath = join(configDir, 'system-prompts.json');
  let originalConfig: string | null = null;

  beforeEach(() => {
    // Backup original config if it exists
    if (existsSync(configPath)) {
      originalConfig = require('fs').readFileSync(configPath, 'utf8');
    }
    
    // Ensure config directory exists
    if (!existsSync(configDir)) {
      mkdirSync(configDir, { recursive: true });
    }
  });

  afterEach(async () => {
    // Reset system prompt cache
    const { resetSystemPromptCache } = await import('../lib/systemPrompt.js');
    resetSystemPromptCache();
    
    // Restore original config or clean up
    if (originalConfig) {
      writeFileSync(configPath, originalConfig);
    } else if (existsSync(configPath)) {
      unlinkSync(configPath);
    }
    
    // Clean up environment
    delete process.env.SYSTEM_PROMPT_INDEX;
    delete process.env.OPENAI_MODEL;
  });

  it('should load valid system prompts configuration', async () => {
    const validConfig = [
      {
        version: "1",
        title: "Test Prompt",
        model: "gpt-4o-mini",
        prompt: "Test prompt text"
      }
    ];
    
    writeFileSync(configPath, JSON.stringify(validConfig));
    
    const { getSystemPromptText, getModel } = await import('../lib/systemPrompt.js');
    expect(getSystemPromptText()).toBe('Test prompt text');
    expect(getModel()).toBe('gpt-4o-mini');
  });

  it('should allow OPENAI_MODEL override', async () => {
    const validConfig = [
      {
        version: "1", 
        title: "Test Prompt",
        model: "gpt-4o-mini",
        prompt: "Test prompt text"
      }
    ];
    
    writeFileSync(configPath, JSON.stringify(validConfig));
    process.env.OPENAI_MODEL = 'gpt-4';
    
    const { getModel } = await import('../lib/systemPrompt.js');
    expect(getModel()).toBe('gpt-4');
  });

  it('should select prompt by SYSTEM_PROMPT_INDEX', async () => {
    const validConfig = [
      {
        version: "1",
        title: "First Prompt",
        model: "gpt-4o-mini", 
        prompt: "First prompt text"
      },
      {
        version: "2",
        title: "Second Prompt", 
        model: "gpt-4",
        prompt: "Second prompt text"
      }
    ];
    
    writeFileSync(configPath, JSON.stringify(validConfig));
    process.env.SYSTEM_PROMPT_INDEX = '1';
    
    const { getSystemPromptText, getModel } = await import('../lib/systemPrompt.js');
    expect(getSystemPromptText()).toBe('Second prompt text');
    expect(getModel()).toBe('gpt-4');
  });

  it('should throw on invalid JSON', async () => {
    writeFileSync(configPath, 'invalid json');
    
    const { getSystemPromptText } = await import('../lib/systemPrompt.js');
    expect(() => getSystemPromptText()).toThrow('Failed to load system prompts');
  });

  it('should throw on invalid schema', async () => {
    const invalidConfig = [
      {
        // missing required fields
        version: "1"
      }
    ];
    
    writeFileSync(configPath, JSON.stringify(invalidConfig));
    
    const { getSystemPromptText } = await import('../lib/systemPrompt.js');
    expect(() => getSystemPromptText()).toThrow('Invalid system prompts configuration');
  });

  it('should throw on empty array', async () => {
    writeFileSync(configPath, JSON.stringify([]));
    
    const { getSystemPromptText } = await import('../lib/systemPrompt.js');
    expect(() => getSystemPromptText()).toThrow('Invalid system prompts configuration');
  });

  it('should throw on out of range SYSTEM_PROMPT_INDEX', async () => {
    const validConfig = [
      {
        version: "1",
        title: "Only Prompt",
        model: "gpt-4o-mini",
        prompt: "Only prompt text"
      }
    ];
    
    writeFileSync(configPath, JSON.stringify(validConfig));
    process.env.SYSTEM_PROMPT_INDEX = '5'; // out of range
    
    const { getSystemPromptText } = await import('../lib/systemPrompt.js');
    expect(() => getSystemPromptText()).toThrow('SYSTEM_PROMPT_INDEX (5) is out of range');
  });
});