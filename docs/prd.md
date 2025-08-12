# PRD — LLM Records Mini-App (Full Spec)

## 1) Objective

Build a minimal full-stack web app that:

* Accepts a user prompt.
* Calls an LLM and expects a **strict JSON object** of records.
* **Wipes previous data** only **after** successful validation.
* Stores the latest prompt and records in SQLite.
* Shows records with basic **CRUD** (Create via API only; no UI button for Create).
* Favors **speed over future-proofing**; keep scope tight.

## 2) Success Criteria

* `npm install && next build && next start` runs the app locally.
* Enter prompt → **Run** → records render from DB.
* Edit/Delete on a single record updates DB & UI without full page reload.
* Re-running replaces all records and updates the “Current prompt” panel.
* Standardized error responses across endpoints.
* “Sensible” unit tests on data libs + validation; light route tests.

## 3) Non-Goals

* Auth, roles, multi-tenancy.
* History of runs (we **globally wipe** on each successful run).
* CI/CD, deployment, streaming, pagination, search, sorting, filters.
* Fancy UI; accessibility beyond basic semantics.
* E2E tests.

## 4) Scope & Flow (Happy Path)

1. User types prompt and clicks **Run**. Button disables; loading state shows.
2. Server builds message: **system prompt** (from local JSON) + **user prompt**.
3. Server calls OpenAI, requests `json_object`.
4. Server validates exact shape:

   ```json
   { "records": [ { "title": "string", "description": "string" } ] }
   ```
5. If valid, **in a single transaction**:

   * Delete all `records`.
   * Upsert single `prompt` row (`id=1`) with the new text.
   * Insert records (cap at `MAX_RECORDS_PER_RUN`; truncate long fields).
6. API returns `{ prompt, records, meta.warnings? }`.
7. UI updates **records list only** from the response (textarea content stays as typed).
8. User can inline-edit or delete records. (Create exists as API only to satisfy CRUD.)

**Failure:** If LLM call/validation fails, **do nothing** to existing DB state; return standardized error; show inline error; keep existing records.

## 5) Users & Use Cases

* Reviewer running locally:

  * Enter prompt → run → see records.
  * Adjust prompt → re-run (old data replaced on success).
  * Edit or delete individual records to tidy content.
  * (API supports manual “Create record” for CRUD completeness; no UI button.)

## 6) Technology & Key Decisions

* **Frontend:** Next.js **15** (App Router), **React 19**, Tailwind CSS.
* **Backend:** Next API routes on **Node** runtime (`export const runtime = "nodejs"`).
* **DB/ORM:** **SQLite** (`better-sqlite3`) + Drizzle ORM.
* **Lang:** TypeScript throughout.
* **LLM:** OpenAI via `OPENAI_API_KEY`; `response_format: json_object` when supported; strict validation regardless.
* **System prompts:** Local JSON file (`/config/system-prompts.json`); pick by `SYSTEM_PROMPT_INDEX` or default to first; allow `OPENAI_MODEL` override.
* **Wipe timing:** **After** successful validation (safety).

### Timestamps in SQLite

* Store `createdAt`/`updatedAt` as **INTEGER Unix ms (UTC)**.
  SQLite has no native datetime; integers sort fast and map cleanly to JS `Date`.

## 7) Data Model (Drizzle / SQLite)

**Table: `prompts`** (single logical row)

* `id` INTEGER PRIMARY KEY (fixed to **1**)
* `text` TEXT NOT NULL
* `createdAt` INTEGER NOT NULL  // Unix ms
* `updatedAt` INTEGER NOT NULL  // Unix ms

**Table: `records`**

* `id` INTEGER PRIMARY KEY AUTOINCREMENT
* `title` TEXT NOT NULL
* `description` TEXT NOT NULL
* `createdAt` INTEGER NOT NULL  // Unix ms
* `updatedAt` INTEGER NOT NULL  // Unix ms

> On any mutation, set `updatedAt = nowMs()`; on create, set both.

## 8) API Contracts

**Base:** `/api` — all routes return JSON.
**Runtime:** all routes include `export const runtime = "nodejs"`.

### `POST /run`

Triggers an LLM “run” and replaces stored data **only if** response validates.

**Body**

```json
{ "prompt": "string" }
```

**Validation**

* `prompt` trimmed; must be `1..MAX_PROMPT_CHARS`.

**LLM call**

* Build messages: system prompt (from JSON file entry) + user prompt.
* Request JSON output (model-level `json_object` if available).
* Parse & validate strictly (see §9).

**Transactional write**

* Delete all from `records`.
* Upsert `prompts` row with `id=1, text, timestamps`.
* Insert validated records (apply cap/truncation; see §9).

**200 OK**

```json
{
  "prompt": { "id": 1, "text": "…", "createdAt": 0, "updatedAt": 0 },
  "records": [
    { "id": 1, "title": "…", "description": "…", "createdAt": 0, "updatedAt": 0 }
  ],
  "meta": { "warnings": ["2 records dropped (max=50)", "3 items truncated"] }
}
```

**422 Validation error** (prompt length / LLM JSON invalid)

```json
{
  "type": "https://errors.local/validation",
  "title": "Validation error",
  "status": 422,
  "detail": "Prompt exceeds MAX_PROMPT_CHARS.",
  "fields": { "prompt": "Max 2000 chars" },
  "errorId": "…"
}
```

**502 Upstream failure** (LLM/network)

```json
{
  "type": "https://errors.local/upstream",
  "title": "LLM request failed",
  "status": 502,
  "detail": "OpenAI error: …",
  "errorId": "…"
}
```

### `GET /prompt`

Returns the latest prompt (or `null` if never run).

**200 OK**

```json
{ "prompt": { "id": 1, "text": "…" } }
```

### `GET /records`

**200 OK**

```json
{ "records": [ { "id": 1, "title": "…", "description": "…" } ] }
```

### `POST /records`  *(Create exists to satisfy CRUD; no UI button)*

**Body**

```json
{ "title": "string", "description": "string" }
```

**201 Created**

```json
{ "record": { "id": 9, "title": "…", "description": "…", "createdAt": 0, "updatedAt": 0 } }
```

**422** (invalid fields) uses standardized error format.

### `PATCH /records/:id`

Partial update (use **PATCH**, not PUT).

**Body**

```json
{ "title": "string?", "description": "string?" }
```

**200 OK**

```json
{ "record": { "id": 9, "title": "…", "description": "…", "createdAt": 0, "updatedAt": 0 } }
```

**404** (missing id) uses standardized error format.

### `DELETE /records/:id`

**200 OK**

```json
{ "ok": true }
```

**404** (missing id) uses standardized error format.

### Standardized Error Format (all routes)

Content-Type: `application/problem+json`

```json
{
  "type": "https://errors.local/<slug>",
  "title": "Validation error",
  "status": 422,
  "detail": "Prompt exceeds MAX_PROMPT_CHARS.",
  "fields": { "prompt": "Max 2000 chars" },
  "errorId": "a1b2c3"
}
```

Status mapping: 400 bad body/JSON, **422** validation, 404 not found, **502** upstream failure, 500 unexpected.

## 9) LLM Contract, Limits, and Validation

**Required response shape (strict)**

```json
{
  "records": [
    { "title": "string", "description": "string" }
  ]
}
```

**Validation rules**

* `records`: array length **>= 1**.
* Each `title`/`description`: trimmed, non-empty strings.
* Reject extra **top-level** keys. Within records, **pick** only `title`/`description` (ignore extras).

**Limits & truncation**

* Cap to `MAX_RECORDS_PER_RUN` (drop extras; add warning).
* Truncate fields:

  * `title` → `MAX_TITLE_CHARS`
  * `description` → `MAX_DESCRIPTION_CHARS`
* Collect any drops/truncations into `meta.warnings` in the success payload. Do **not** fail the whole run due to length.

**Zod (informative)**

```ts
const LlmResponseSchema = z.object({
  records: z.array(z.object({
    title: z.string().trim().min(1),
    description: z.string().trim().min(1),
  })).min(1)
});
```

**Prompting**

* System prompt from `/config/system-prompts.json`, selected by index.
* Add explicit instruction: “Respond with **only** a JSON object exactly matching `{ records: [{ title, description }] }`. No markdown, no prose.”
* Use `response_format: { type: "json_object" }` when supported by the chosen model.

## 10) UI / UX Spec

**Single page** (App Router):

* **Prompt form (top):**

  * Textarea with `maxLength={MAX_PROMPT_CHARS}` and live counter.
  * **Run** button:

    * Disabled if `len === 0` or `len > MAX_PROMPT_CHARS`.
    * Disabled + spinner while request in-flight (guard duplicate clicks with `isRunning`).
  * On success: update **records list only** using response; **do not** reset textarea.
  * On failure: show inline error; keep existing records.

* **Current prompt panel:**

  * Read-only display of the stored “current prompt” (from `/prompt` or last `/run` response).

* **Records list:**

  * Render each record’s `title` + `description`.
  * **Edit inline** (inputs) with Save/Cancel; send `PATCH /records/:id`.
  * **Delete** via icon + `confirm()`; send `DELETE /records/:id`.
  * Show `meta.warnings` (if any) as a small alert above the list.

* **Empty states:**

  * Before any run: prompt form and hint text.
  * After successful run: list of records (should be non-empty due to schema).

**Client/Server split**

* `app/page.tsx` (Server Component) fetches initial prompt + records.
* `RunForm.tsx`, `RecordsList.tsx` (Client Components) handle mutations & local state.
* No `router.refresh()` after `/run`; rely on returned payload to update state.

## 11) Constants & Config

**`/lib/consts.ts`** (env-overridable defaults):

```ts
export const MAX_RECORDS_PER_RUN =
  parseInt(process.env.MAX_RECORDS_PER_RUN ?? "50");
export const MAX_PROMPT_CHARS =
  parseInt(process.env.MAX_PROMPT_CHARS ?? "2000");
export const MAX_TITLE_CHARS =
  parseInt(process.env.MAX_TITLE_CHARS ?? "200");
export const MAX_DESCRIPTION_CHARS =
  parseInt(process.env.MAX_DESCRIPTION_CHARS ?? "2000");

export const SQLITE_PATH = process.env.SQLITE_PATH ?? "./data/app.db";
export const OPENAI_MODEL = process.env.OPENAI_MODEL ?? "gpt-5-nano";
export const SYSTEM_PROMPT_INDEX =
  parseInt(process.env.SYSTEM_PROMPT_INDEX ?? "0");
```

**Env vars**

* `OPENAI_API_KEY` **(required)**
* Optional: `OPENAI_MODEL`, `SYSTEM_PROMPT_INDEX`, `MAX_RECORDS_PER_RUN`, `MAX_PROMPT_CHARS`, `MAX_TITLE_CHARS`, `MAX_DESCRIPTION_CHARS`, `SQLITE_PATH`.

Ship `.env.example`; use `.env.local` in dev:

```
OPENAI_API_KEY=
OPENAI_MODEL=gpt-5-nano
SYSTEM_PROMPT_INDEX=0
MAX_RECORDS_PER_RUN=50
MAX_PROMPT_CHARS=2000
MAX_TITLE_CHARS=200
MAX_DESCRIPTION_CHARS=2000
SQLITE_PATH=./data/app.db
```

## 12) System Prompts File

**`/config/system-prompts.json`** (validated at startup):

```json
[
  {
    "version": "1",
    "title": "Default List Generator",
    "model": "gpt-5-nano",
    "prompt": "You output only a JSON object with this exact shape: { \"records\": [{ \"title\": \"string\", \"description\": \"string\" }] } ..."
  }
]
```

* Select by `SYSTEM_PROMPT_INDEX` (default `0`).
* `OPENAI_MODEL` env overrides `model` if set.

## 13) Folder Structure

```
/app
  /api
    /run/route.ts                // POST
    /prompt/route.ts             // GET
    /records/route.ts            // GET, POST
    /records/[id]/route.ts       // PATCH, DELETE
  page.tsx
  components/
    RunForm.tsx                  // client
    RecordsList.tsx              // client
/config/system-prompts.json
/data                            // db file (gitignored)
/drizzle                         // migrations (or CREATE IF NOT EXISTS)
/lib
  consts.ts
  db.ts                          // drizzle + better-sqlite3 init
  http.ts                        // problem()/ok() helpers
  llm.ts                         // OpenAI call + schema validation + cap/truncate
  prompts.ts                     // CRUD for prompt (id=1)
  records.ts                     // CRUD for records
  time.ts                        // nowMs()
/tests (vitest)
  llm.test.ts
  records.test.ts
  prompts.test.ts
  run-route.test.ts
.env.example
```

## 14) Setup & Run

```bash
npm install
next build
next start
```

* Ensure `.env.local` contains `OPENAI_API_KEY`.
* On first run, DB file is created; migrations run at runtime (or `CREATE TABLE IF NOT EXISTS` fallback).

## 15) Testing Strategy (Vitest)

**Framework:** **Vitest** (ESM-native, fast).
**Why not Jest?** Heavier ESM/TS config; slower; unnecessary for this scope.

**Config**

* `vitest.config.ts`:

  * `setupFiles: ['dotenv/config']` (load env before imports).
  * Mirror TS path aliases if used (or prefer relative imports).

**Runtime parity**

* Use Node 20 locally and in tests; set `"engines": { "node": "20.x" }`.

**DB in tests**

* Point `SQLITE_PATH` to `:memory:` or `./.tmp/test.db`; clean up after.

**Route testing**

* Export `POST/GET/PATCH/DELETE` from `route.ts`.
* Invoke with standard `new Request(url, { method, body, headers })`.
* Keep core logic free of Next-only request APIs when possible.

**Mocking LLM**

* Place call logic in `lib/llm.ts`; `vi.mock('@/lib/llm', ...)` to return deterministic JSON.

**Coverage focus**

* Validation: prompt length, LLM invalid JSON, over-cap drops, truncation warnings.
* Transaction: **wipe occurs only after successful validate**.
* CRUD: records PATCH/DELETE happy path + 404.
* Error format: shapes/status codes consistent across routes.

## 16) Risks & Cut Lines

* **LLM JSON drift** → Strict schema + `json_object`; if repeated failures, (optional) sanitize then parse—only if time permits.
* **Runtime mismatch** (Edge vs Node) → Ensure `export const runtime = "nodejs"` in API routes.
* **Ephemeral FS on Vercel** (if deployed) → Don’t rely on persistence there; this task is local-first.
* **Time slip** → Cut inline editing polish (use simple form), or drop `/records` POST (still have CRUD via LLM create; but keep if feasible).

## 17) Implementation Plan (Tasks)

1. **Constants & Env**

   * `lib/consts.ts`; `.env.example`; document `.env.local`.
2. **DB & Libs**

   * `db.ts` init; migrations or `CREATE TABLE IF NOT EXISTS`.
   * `time.ts` (`nowMs()`).
   * `prompts.ts`, `records.ts` with timestamps and errors.
3. **Errors**

   * `http.ts` helpers; all routes return `application/problem+json` on errors.
4. **LLM & Validation**

   * `llm.ts`: OpenAI call (`response_format: json_object`), zod validation, cap/truncate, warnings aggregation.
5. **Routes**

   * `/api/run` (parse/validate prompt, call LLM, validate, **transactional** writes).
   * `/api/prompt` (GET).
   * `/api/records` (GET, POST).
   * `/api/records/[id]` (PATCH, DELETE).
6. **UI**

   * `RunForm.tsx`: textarea with `maxLength`, counter, `isRunning`, disable rules; call `/run`; update records only; show errors/warnings.
   * `RecordsList.tsx`: list + inline edit/delete.
   * `page.tsx`: initial server fetch for prompt + records.
7. **Tests (Vitest)**

   * Unit: `llm.ts` (bad/good cases, cap/truncate).
   * Libs: prompts/records timestamp semantics.
   * Routes: `/run` success/validation failure; records PATCH/DELETE + 404; error shapes.
