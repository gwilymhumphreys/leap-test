
// Only validate on server
if (typeof window === 'undefined') {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('Missing process.env.OPENAI_API_KEY, create a .env.local file with the following content: OPENAI_API_KEY=your_api_key');
  }
}

export const MAX_RECORDS_PER_RUN =
  parseInt(process.env.MAX_RECORDS_PER_RUN ?? "50");
export const MAX_PROMPT_CHARS =
  parseInt(process.env.MAX_PROMPT_CHARS ?? "2000");
export const MAX_TITLE_CHARS =
  parseInt(process.env.MAX_TITLE_CHARS ?? "200");
export const MAX_DESCRIPTION_CHARS =
  parseInt(process.env.MAX_DESCRIPTION_CHARS ?? "2000");

// Client-side accessible constants (with NEXT_PUBLIC_ prefix)
export const NEXT_PUBLIC_MAX_PROMPT_CHARS = MAX_PROMPT_CHARS;

export const SQLITE_PATH = process.env.SQLITE_PATH ?? "./data/app.db";
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5-nano";
export const SYSTEM_PROMPT_INDEX =
  parseInt(process.env.SYSTEM_PROMPT_INDEX ?? "0");
