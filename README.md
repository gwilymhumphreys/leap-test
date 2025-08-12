# LLM Records

A minimal full-stack web application that generates structured JSON records using Large Language Models (LLMs). Built with Next.js 15, SQLite, and OpenAI API.

## Features

- **AI-Powered Record Generation**: Enter prompts to generate structured records via OpenAI API
- **Real-time CRUD Operations**: Create, read, update, and delete records with inline editing
- **Robust Validation**: Client and server-side validation with standardized error responses
- **SQLite Database**: Local persistence with Drizzle ORM
- **Responsive Design**: Clean Tailwind CSS interface with dark mode support
- **Type Safety**: Full TypeScript implementation
- **Comprehensive Testing**: 37 unit tests covering all core functionality

## Quick Start

### Prerequisites

- Node.js 20.x
- OpenAI API key

### Installation

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env.local
   ```

   Add your OpenAI API key to `.env.local`:
   ```
   OPENAI_API_KEY=your-api-key-here
```

3. **Run the application:**
   ```bash
   npm run dev
   ```

   Visit [http://localhost:3000](http://localhost:3000)

## Available Scripts

- `npm run dev` - Start development server with Turbopack
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run test` - Run all tests
- `npm run test:watch` - Run tests in watch mode
- `npm run lint` - Run ESLint

## Configuration

All limits and settings can be customized via environment variables in `.env.local`:

```bash
# Required
OPENAI_API_KEY=your-api-key-here

# Optional (defaults shown)
OPENAI_MODEL=gpt-5-nano
SYSTEM_PROMPT_INDEX=0
MAX_RECORDS_PER_RUN=50
MAX_PROMPT_CHARS=2000
MAX_TITLE_CHARS=200
MAX_DESCRIPTION_CHARS=2000
SQLITE_PATH=./data/app.db
```

## API Endpoints

- `POST /api/run` - Generate records from prompt
- `GET /api/prompt` - Get current prompt
- `GET /api/records` - List all records
- `POST /api/records` - Create new record
- `PATCH /api/records/[id]` - Update record
- `DELETE /api/records/[id]` - Delete record

All API routes return standardized JSON responses with proper error handling using `application/problem+json` format.

## Architecture

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS
- **Backend**: Next.js API routes with Node.js runtime
- **Database**: SQLite with better-sqlite3 + Drizzle ORM
- **LLM**: OpenAI API with strict JSON validation
- **Testing**: Vitest with comprehensive unit tests

## Key Design Principles

- **Wipe-after-validate**: Existing data is only replaced after successful LLM response validation
- **Standardized errors**: All endpoints use consistent `application/problem+json` format
- **Strict validation**: JSON schema validation with configurable limits and truncation
- **Single-transaction writes**: Ensures data consistency
- **Node.js runtime**: All API routes explicitly use Node.js runtime for better-sqlite3 compatibility

## Testing

Run the comprehensive test suite:

```bash
npm run test
```

Tests cover LLM validation, database operations, API error handling, system prompt loading, and HTTP helpers.

## Production Deployment

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start production server:**
   ```bash
   npm run start
   ```

3. **Environment setup:**
   - Ensure `OPENAI_API_KEY` is set
   - Configure `SQLITE_PATH` for persistent storage
   - Set other limits as needed for your use case

## Limits and Warnings

The application includes built-in safeguards:

- **Record limits**: Caps generated records to `MAX_RECORDS_PER_RUN` (default: 50)
- **Field truncation**: Automatically truncates long titles/descriptions
- **Prompt validation**: Enforces `MAX_PROMPT_CHARS` limit (default: 2000)
- **Warning system**: Displays non-fatal warnings for truncation and limits

---

*Built with Next.js 15, bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).*
