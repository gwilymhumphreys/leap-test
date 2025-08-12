import { getLatestPrompt } from '@/lib/prompts';
import { ok, problem } from '@/lib/http';

// Ensure Node.js runtime for better-sqlite3 compatibility
export const runtime = 'nodejs';

export async function GET() {
  try {
    const prompt = await getLatestPrompt();
    return ok({ prompt });
  } catch (error) {
    console.error('Error fetching prompt:', error);
    return problem(
      500,
      'Internal server error',
      'Failed to fetch prompt'
    );
  }
}