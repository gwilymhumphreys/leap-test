import { readFileSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';

const SystemPromptSchema = z.object({
  version: z.string(),
  title: z.string(),
  model: z.string(),
  prompt: z.string()
});

const SystemPromptsArraySchema = z.array(SystemPromptSchema).min(1);

// Load and validate system prompts
function loadSystemPrompts() {
  try {
    const configPath = join(process.cwd(), 'config', 'system-prompts.json');
    const jsonContent = readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(jsonContent);
    
    // Validate the structure
    const systemPrompts = SystemPromptsArraySchema.parse(parsed);
    
    return systemPrompts;
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`Invalid system prompts configuration: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw new Error(`Failed to load system prompts: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

function getSystemPromptConfig() {
  // Read constants dynamically to support test environment variables
  const SYSTEM_PROMPT_INDEX = parseInt(process.env.SYSTEM_PROMPT_INDEX ?? "0");
  const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "";

  const systemPrompts = loadSystemPrompts();

  // Select the prompt by index
  if (SYSTEM_PROMPT_INDEX >= systemPrompts.length) {
    throw new Error(`SYSTEM_PROMPT_INDEX (${SYSTEM_PROMPT_INDEX}) is out of range. Available prompts: 0-${systemPrompts.length - 1}`);
  }

  const selectedPrompt = systemPrompts[SYSTEM_PROMPT_INDEX];

  return {
    systemPromptText: selectedPrompt.prompt,
    model: OPENAI_MODEL || selectedPrompt.model
  };
}

// Cache the config on first access
let cachedConfig: { systemPromptText: string; model: string } | null = null;

function getConfig() {
  if (!cachedConfig) {
    cachedConfig = getSystemPromptConfig();
  }
  return cachedConfig;
}

// Export getter functions for the values
export function getSystemPromptText(): string {
  return getConfig().systemPromptText;
}

export function getModel(): string {
  return getConfig().model;
}

// Export function to reset cache (for testing)
export function resetSystemPromptCache() {
  cachedConfig = null;
}

// For backwards compatibility, export the values as well
export const systemPromptText = '';  // Will be computed lazily
export const model = '';  // Will be computed lazily

// Override the exports with lazy getters
Object.defineProperty(exports, 'systemPromptText', {
  get: getSystemPromptText,
  enumerable: true
});

Object.defineProperty(exports, 'model', {
  get: getModel, 
  enumerable: true
});