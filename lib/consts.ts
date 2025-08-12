export const MAX_RECORDS_PER_RUN =
  parseInt(process.env.MAX_RECORDS_PER_RUN ?? "50");
export const MAX_PROMPT_CHARS =
  parseInt(process.env.MAX_PROMPT_CHARS ?? "2000");
export const MAX_TITLE_CHARS =
  parseInt(process.env.MAX_TITLE_CHARS ?? "200");
export const MAX_DESCRIPTION_CHARS =
  parseInt(process.env.MAX_DESCRIPTION_CHARS ?? "2000");

export const SQLITE_PATH = process.env.SQLITE_PATH ?? "./data/app.db";
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
export const SYSTEM_PROMPT_INDEX =
  parseInt(process.env.SYSTEM_PROMPT_INDEX ?? "0");