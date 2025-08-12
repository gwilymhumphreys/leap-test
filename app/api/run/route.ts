import { z } from 'zod';
import { getSystemPromptText, getModel } from '@/lib/systemPrompt';
import { buildMessages, callLlm, parseAndValidate, applyGuards } from '@/lib/llm';
import { upsertPrompt } from '@/lib/prompts';
import { createRecord, truncateRecords } from '@/lib/records';
import { ok, problem } from '@/lib/http';

// Ensure Node.js runtime for better-sqlite3 compatibility
export const runtime = 'nodejs';

// Validation schema for request body
const RunRequestSchema = z.object({
  prompt: z.string()
});

export async function POST(request: Request) {
  try {
    // Parse and validate request body
    let requestBody;
    try {
      requestBody = await request.json();
    } catch {
      return problem(
        400,
        'Bad request',
        'Invalid JSON in request body'
      );
    }

    const parseResult = RunRequestSchema.safeParse(requestBody);
    if (!parseResult.success) {
      return problem(
        422,
        'Validation error',
        'Invalid request format',
        { fields: { prompt: 'Required field' } }
      );
    }

    const { prompt } = parseResult.data;
    const trimmedPrompt = prompt.trim();

    // Validate prompt length
    const MAX_PROMPT_CHARS = parseInt(process.env.MAX_PROMPT_CHARS ?? "2000");
    if (trimmedPrompt.length === 0) {
      return problem(
        422,
        'Validation error',
        'Prompt cannot be empty',
        { fields: { prompt: 'Cannot be empty' } }
      );
    }
    if (trimmedPrompt.length > MAX_PROMPT_CHARS) {
      return problem(
        422,
        'Validation error',
        `Prompt exceeds maximum length of ${MAX_PROMPT_CHARS} characters`,
        { fields: { prompt: `Max ${MAX_PROMPT_CHARS} chars` } }
      );
    }

    // Build messages for LLM
    const systemPromptText = getSystemPromptText();
    const model = getModel();
    const messages = buildMessages(systemPromptText, trimmedPrompt);

    // Call LLM
    let llmResponse: string;
    try {
      llmResponse = await callLlm(messages, model);
    } catch (error) {
      console.error('LLM call failed:', error);
      return problem(
        502,
        'LLM request failed',
        `OpenAI error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { type: 'https://errors.local/upstream' }
      );
    }

    // Parse and validate LLM response
    let parsedRecords;
    try {
      parsedRecords = parseAndValidate(llmResponse);
    } catch (error) {
      console.error('LLM response validation failed:', error);
      return problem(
        502,
        'LLM response validation failed',
        `Invalid response from LLM: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { type: 'https://errors.local/upstream' }
      );
    }

    // Apply guards (truncation, limits) and collect warnings
    const { records: processedRecords, warnings } = applyGuards(parsedRecords.records);

    // Transactional writes: truncate -> upsert prompt -> insert records
    try {
      // Clear existing records first
      await truncateRecords();
      
      // Update the prompt
      const updatedPrompt = await upsertPrompt(trimmedPrompt);
      
      // Insert all new records
      const insertedRecords = [];
      for (const record of processedRecords) {
        const inserted = await createRecord({
          title: record.title,
          description: record.description
        });
        insertedRecords.push(inserted);
      }

      // Return success response
      return ok({
        prompt: updatedPrompt,
        records: insertedRecords,
        meta: { warnings }
      });
      
    } catch (error) {
      console.error('Database transaction failed:', error);
      return problem(
        500,
        'Database error',
        'Failed to save records to database'
      );
    }

  } catch (error) {
    console.error('Unexpected error in /api/run:', error);
    return problem(
      500,
      'Internal server error',
      'An unexpected error occurred'
    );
  }
}