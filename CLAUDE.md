# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a full-stack Next.js 15 application for LLM Records - a minimal web app that accepts user prompts, calls an LLM to generate structured JSON records, and provides CRUD operations on those records. The project prioritizes speed over future-proofing with a tight scope.

## Architecture

**Technology Stack:**
- Frontend: Next.js 15 (App Router), React 19, Tailwind CSS
- Backend: Next.js API routes with Node.js runtime
- Database: SQLite with better-sqlite3 + Drizzle ORM
- LLM: OpenAI API with strict JSON validation
- Testing: Vitest
- Language: TypeScript throughout

**Key Design Principles:**
- All API routes must use `export const runtime = "nodejs"`
- Wipe-after-validate: existing data is only replaced after successful LLM response validation
- Standardized error responses using `application/problem+json` format
- Strict JSON schema validation with configurable limits and truncation
- Single-transaction writes for data consistency

## Development Commands

```bash
# Install dependencies
npm install

# Development
npm run dev

# Build and production
npm run build
npm run start

# Testing
npm run test        # Run all tests
npm run test:watch  # Watch mode
```

## Data Model

**Tables:**
- `prompts`: Single row (id=1) storing the current prompt with timestamps
- `records`: Generated records with title/description and timestamps

**Timestamps:** Stored as INTEGER Unix milliseconds (UTC) for SQLite compatibility

## Core Components Structure

```
/app
  /api
    /run/route.ts              # POST - Main LLM execution endpoint
    /prompt/route.ts           # GET - Retrieve current prompt
    /records/route.ts          # GET, POST - List/create records
    /records/[id]/route.ts     # PATCH, DELETE - Update/delete records
  page.tsx                     # Server component with initial data fetch
  /components
    RunForm.tsx                # Client component for prompt input
    RecordsList.tsx            # Client component for CRUD operations

/lib
  consts.ts                    # Environment-configurable constants
  db.ts                        # SQLite + Drizzle initialization
  schema.ts                    # Database schema definitions
  http.ts                      # Standardized error response helpers
  llm.ts                       # OpenAI integration + validation
  prompts.ts                   # Prompt data access layer
  records.ts                   # Records data access layer
  time.ts                      # Timestamp utilities

/config
  system-prompts.json          # LLM system prompts configuration

/tests                         # Vitest test files
```

## Configuration

**Required Environment Variables:**
- `OPENAI_API_KEY` - OpenAI API key for LLM calls

**Optional Environment Variables:**
- `OPENAI_MODEL` (default: gpt-4o-mini)
- `SYSTEM_PROMPT_INDEX` (default: 0)
- `MAX_RECORDS_PER_RUN` (default: 50)
- `MAX_PROMPT_CHARS` (default: 2000)
- `MAX_TITLE_CHARS` (default: 200)
- `MAX_DESCRIPTION_CHARS` (default: 2000)
- `SQLITE_PATH` (default: ./data/app.db)

Copy `.env.example` to `.env.local` for development.

## API Design

All endpoints return JSON and use standardized error format:

```json
{
  "type": "https://errors.local/<slug>",
  "title": "Error Title",
  "status": 422,
  "detail": "Detailed error message",
  "fields": {"field": "Field-specific error"},
  "errorId": "unique-id"
}
```

**Status Code Mapping:**
- 400: Bad request body/JSON
- 422: Validation errors
- 404: Not found
- 502: Upstream LLM failures
- 500: Unexpected errors

## LLM Integration

**Required Response Format:**
```json
{
  "records": [
    {"title": "string", "description": "string"}
  ]
}
```

**Validation & Limits:**
- Records array must have >= 1 items
- Extra top-level keys rejected
- Record count capped at `MAX_RECORDS_PER_RUN`
- Fields truncated to configured limits
- Warnings collected for UI display

## Testing Strategy

**Framework:** Vitest with Node.js 20 runtime parity

**Key Test Areas:**
- LLM validation (invalid JSON, limits, truncation)
- Data layer CRUD operations with proper timestamps
- Route behavior including error handling
- Transaction semantics (wipe-after-validate)

**Database in Tests:**
- Use `:memory:` SQLite or temporary files
- Clean state between tests

## Development Notes

**Critical Requirements:**
- Always use Node.js runtime in API routes
- Maintain transaction safety in `/api/run`
- Follow standardized error format across all endpoints
- Preserve existing data on LLM/validation failures
- Apply field truncation consistently

**UI Behavior:**
- Textarea content preserved after successful runs
- Loading states prevent duplicate submissions
- Inline editing without page reloads
- Display warnings from LLM response processing

Use `lib/consts.ts` for all configurable limits and `lib/http.ts` helpers for consistent error responses.



## ⚠️ MANDATORY File Check

**CRITICAL**: After ANY modification to files, you MUST immediately use the `file-checker` agent to validate compilation. This is NON-NEGOTIABLE.

**Required Workflow:**

1. Make file changes
2. **IMMEDIATELY** run file-checker agent
3. Agent will fix any errors or warnings found
4. Only proceed when compilation is clean

## ⚠️ MANDATORY Test Validation After Major Tasks

**CRITICAL**: After completing ANY major task, you MUST use the `test-failure-resolver` agent to ensure all tests pass. See `docs/testing.md` for complete guidelines.


## Claude Code Agents

- **file-checker**: **MANDATORY** - Use this agent immediately after modifying ANY files to validate formatting and fix errors automatically. Never skip this step.
- **test-failure-resolver**: **MANDATORY** - Use this agent immediately after completing any major task to run tests and fix failures. Never skip this step.
