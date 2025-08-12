import { z } from 'zod';

// Zod schema for LLM response validation
const LlmResponseSchema = z.object({
  records: z.array(z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
  })).min(1)
}).strict(); // strict() rejects extra keys

export interface ProcessedRecord {
  title: string;
  description: string;
}

export interface ProcessingResult {
  records: ProcessedRecord[];
  warnings: string[];
}

export function buildMessages(systemPrompt: string, userPrompt: string) {
  return [
    {
      role: 'system' as const,
      content: systemPrompt
    },
    {
      role: 'user' as const, 
      content: userPrompt
    }
  ];
}

export async function callLlm(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  model: string
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('OPENAI_API_KEY environment variable is required');
  }

  const payload = {
    model,
    messages,
    response_format: { type: 'json_object' as const }
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error (${response.status}): ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || '';
}

export function parseAndValidate(rawText: string): { records: ProcessedRecord[] } {
  // Parse JSON
  let parsed;
  try {
    parsed = JSON.parse(rawText);
  } catch (error) {
    throw new Error(`Invalid JSON response from LLM: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // Validate with Zod schema (strict mode rejects extra top-level keys)
  try {
    const validated = LlmResponseSchema.parse(parsed);
    
    // Pick only title/description from each record (ignoring any extra fields)
    const cleanedRecords = validated.records.map(record => ({
      title: record.title,
      description: record.description
    }));

    return { records: cleanedRecords };
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Error(`LLM response validation failed: ${error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ')}`);
    }
    throw error;
  }
}

export function applyGuards(records: ProcessedRecord[]): ProcessingResult {
  // Read constants dynamically to support test environment variables
  const MAX_RECORDS_PER_RUN = parseInt(process.env.MAX_RECORDS_PER_RUN ?? "50");
  const MAX_TITLE_CHARS = parseInt(process.env.MAX_TITLE_CHARS ?? "200");
  const MAX_DESCRIPTION_CHARS = parseInt(process.env.MAX_DESCRIPTION_CHARS ?? "2000");

  const warnings: string[] = [];
  let processedRecords = [...records];

  // Apply record count limit
  if (processedRecords.length > MAX_RECORDS_PER_RUN) {
    const dropped = processedRecords.length - MAX_RECORDS_PER_RUN;
    processedRecords = processedRecords.slice(0, MAX_RECORDS_PER_RUN);
    warnings.push(`${dropped} records dropped (max=${MAX_RECORDS_PER_RUN})`);
  }

  // Apply field truncation
  let truncatedCount = 0;
  processedRecords = processedRecords.map(record => {
    let title = record.title;
    let description = record.description;
    
    if (title.length > MAX_TITLE_CHARS) {
      title = title.substring(0, MAX_TITLE_CHARS);
      truncatedCount++;
    }
    
    if (description.length > MAX_DESCRIPTION_CHARS) {
      description = description.substring(0, MAX_DESCRIPTION_CHARS);
      truncatedCount++;
    }

    return { title, description };
  });

  if (truncatedCount > 0) {
    warnings.push(`${truncatedCount} fields truncated`);
  }

  return {
    records: processedRecords,
    warnings
  };
}