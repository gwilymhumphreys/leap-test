# Implementation Task List

## 0) Repo scaffolding

* Init Next.js 15 app (App Router, TS, Tailwind).

  * `npx create-next-app@latest` (choose App Router, TS, Tailwind)
* Add directories:

  * `/config`, `/data` (gitignored), `/lib`, `/drizzle`, `/tests`, `/app/components`
* Add `.gitignore` entries:

  * `data/`, `.env.local`, `/.tmp/`
* Add `.env.example` (from PRD §11/§20)
* Ensure `"type": "module"` in `package.json`.

**Accept:** Project builds with `next build`. Tailwind classes render on a sample page.

---

## 1) Dependencies

* Install DB + ORM + validation + test libs:

  * `npm i better-sqlite3 drizzle-orm zod`
  * `npm i -D drizzle-kit vitest @types/better-sqlite3 dotenv`
* (Optional) Install OpenAI SDK or use `fetch`. For simplicity, use `fetch` unless you want SDK:

  * `npm i openai` (optional)

**Accept:** `node -e "require('better-sqlite3')"` works (or ESM import), `npx vitest --version` ok.

---

## 2) Constants & Env

* Create `/lib/consts.ts` with all defaults + env overrides (PRD §11).
* Create `.env.example` per PRD and commit it.
* Ensure dev uses `.env.local` (don’t commit).

**Accept:** Importing `consts.ts` returns defaults when env unset and overridden when set.

---

## 3) Time & Error Helpers

* `/lib/time.ts`:

  * `export const nowMs = () => Date.now();`
* `/lib/http.ts`:

  * `problem(status, title, detail, extras?)` → returns `Response` with `application/problem+json`.
  * `ok(data, initOverrides?)` → JSON response wrapper (optional but consistent).
* Unit test `problem()` for shape and headers.

**Accept:** Any route can `return problem(422, 'Validation error', '…', { fields: {...} })`.

---

## 4) SQLite + Drizzle setup

* `/lib/db.ts`:

  * Ensure directory for DB exists if path is `./data/app.db`.
  * Init `better-sqlite3` with `SQLITE_PATH`.
  * Create Drizzle instance.
* Schema:

  * `/lib/schema.ts` with Drizzle tables `prompts`, `records` (PRD §7).
* Migration approach (choose one):

  * **Fast path:** On startup, run `CREATE TABLE IF NOT EXISTS` via Drizzle SQL.
  * **OR** wire drizzle migrator with compiled migrations in `/drizzle`.
* Add `export type` for `Record` model used by APIs.

**Accept:** First server start creates DB/tables. Reads/writes succeed.

---

## 5) Data access libraries

* `/lib/prompts.ts`:

  * `getLatestPrompt(): Promise<{id:number,text:string,createdAt:number,updatedAt:number}|null>`
  * `upsertPrompt(text: string): Promise<Prompt>` (id fixed at 1; set timestamps)
* `/lib/records.ts`:

  * `listRecords(): Promise<Record[]>`
  * `createRecord({title,description}): Promise<Record>`
  * `updateRecord(id, partial): Promise<Record>` (patch semantics; update `updatedAt`)
  * `deleteRecord(id): Promise<void>`
  * `truncateRecords(): Promise<void>`

**Accept:** Unit tests (simple) pass for prompt upsert, list/create/update/delete, truncate.

---

## 6) LLM call & validation

* `/lib/llm.ts`:

  * Zod schema per PRD §9.
  * `buildMessages(systemPrompt: string, userPrompt: string)` returns OpenAI-style messages array.
  * `callLlm(messages, model)`: perform fetch to OpenAI chat completions with `response_format: { type: 'json_object' }` when supported; return raw text (or JSON).
  * `parseAndValidate(rawText)`:

    * Parse JSON.
    * Zod validate exact top-level (reject extras).
    * Pick `title/description` from records.
  * `applyGuards(records)`:

    * Cap to `MAX_RECORDS_PER_RUN` (drop extras; collect warning).
    * Truncate `title/description` to `MAX_TITLE_CHARS`/`MAX_DESCRIPTION_CHARS` (collect warnings).

**Accept:** Unit tests for:

* invalid JSON → throw validation error,
* > MAX count → returns MAX and warning,
* overly long fields → truncated + warning.

---

## 7) System prompt loading

* `/config/system-prompts.json` with initial entry (PRD §12).
* `/lib/systemPrompt.ts`:

  * Load JSON at startup (synchronously in Node).
  * Validate shape (array of objects with version/title/model/prompt).
  * Select by `SYSTEM_PROMPT_INDEX` (default 0).
  * Allow `OPENAI_MODEL` override.
  * Export `{ systemPromptText, model }`.

**Accept:** Throws on bad JSON shape at boot (dev fast-fail). Provides text + model for `/run`.

---

## 8) API routes — shared concerns

* All routes must include:

  * `export const runtime = 'nodejs';`
  * Standard error responses via `problem()`.
* Ensure **Node** runtime is honored (no Edge APIs that break `better-sqlite3`).

**Accept:** Hitting any route returns JSON and correct `content-type`.

---

## 9) `/api/run/route.ts` (POST)

* Validate request body JSON: `{ prompt: string }`.
* Trim and validate prompt length `1..MAX_PROMPT_CHARS`; else `422` with `fields.prompt`.
* Build messages: system + user.
* Call LLM; catch upstream errors → `502` with standardized body.
* Parse & validate payload via `llm.ts`; get `records` + `warnings`.
* **Transaction**:

  * `truncateRecords()`
  * `upsertPrompt(prompt)`
  * Insert all `records` (loop with `createRecord`, or batch insert)
* Return `200` with `{ prompt, records, meta: { warnings } }`.

**Accept:** Happy path inserts and returns. If LLM or validation fails, existing data remains intact.

---

## 10) `/api/prompt/route.ts` (GET)

* Return `{ prompt: Prompt | null }`.

**Accept:** Returns `null` before any run; returns latest after.

---

## 11) `/api/records/route.ts` (GET, POST)

* **GET**: Return all records.
* **POST**: Validate body `{ title, description }` (non-empty, apply truncation to be consistent). Create record. Return `201`.

**Accept:** Correct codes, standard errors on invalid payload.

---

## 12) `/api/records/[id]/route.ts` (PATCH, DELETE)

* Parse `id` from params; `404` if not found.
* **PATCH**:

  * Validate body with optional `title`/`description` (at least one provided).
  * Apply truncation rules; update timestamps.
  * Return updated record.
* **DELETE**: Delete and return `{ ok: true }`.

**Accept:** 404 on missing id; PATCH updates only provided fields.

---

## 13) Page & data loading

* `app/page.tsx` (Server Component):

  * Fetch initial prompt + records via server-side calls to libs (not via HTTP).
  * Render:

    * `<RunForm initialPromptText={prompt?.text ?? ''} />`
    * `<CurrentPrompt text={prompt?.text ?? ''} />` (can be part of `RunForm` if simpler)
    * `<RecordsList initialRecords={records} />`

**Accept:** First load shows existing DB state (or empty).

---

## 14) `RunForm.tsx` (Client)

* Textarea:

  * `maxLength={MAX_PROMPT_CHARS}`
  * Live counter (`len/MAX_PROMPT_CHARS`)
* Button:

  * Disabled when `len===0 || len>MAX_PROMPT_CHARS || isRunning`
  * Shows spinner when `isRunning`
* On submit:

  * `isRunning = true`
  * `fetch('/api/run', { method: 'POST', body: JSON.stringify({ prompt }) })`
  * On `200`:

    * Parse response `{ records, meta }`
    * **Update records state** via parent setter/context (don’t touch textarea value)
    * Show any `meta.warnings` in a small alert slot
  * On error:

    * Parse standardized error JSON and show inline message
  * Finally: `isRunning = false`

**Accept:** No duplicate submits. Textarea content remains. Warnings display if present.

---

## 15) `RecordsList.tsx` (Client)

* Accept `initialRecords` prop and keep local state (`records`).
* Render list:

  * Each item: title, description, edit and delete controls.
* Edit flow:

  * Toggle edit mode for a record → inputs with current values → Save/Cancel.
  * On Save: `PATCH /api/records/:id` with changed fields only.
  * On success: merge returned record into `records` state.
* Delete flow:

  * `confirm()` → `DELETE /api/records/:id`
  * On success: remove from `records` state.
* Empty state text when zero records.

**Accept:** Inline edits and deletes round-trip and update UI state without page reload.

---

## 16) Current prompt panel

* Can be a simple component or included at top of `RecordsList`.
* Displays the **stored** prompt (from server render, updated after successful `/run` call via response payload used to update a `promptText` state in parent, if you choose to display it dynamically).
* Important: **Do not overwrite** the textarea content in `RunForm`.

**Accept:** Matches stored prompt after a successful run; independent of current textarea.

---

## 17) Styling

* Minimal Tailwind:

  * Page container, form spacing, buttons (disabled state), list cards.
  * Small alert/banner for warnings; red text for errors.
* Basic keyboard accessibility:

  * Labels for inputs, buttons reachable via tab.

**Accept:** UI is readable, simple, and matches behavior constraints.

---

## 18) Standardized error handling (wire-up)

* Ensure every API path uses `problem()` for errors.
* Map validation issues to `422` with `fields` where applicable.
* Upstream LLM/network → `502`.
* Unexpected → `500`.

**Accept:** Manual negative tests return consistent shapes across endpoints.

---

## 19) Tests (Vitest)

* **Config**:

  * `vitest.config.ts` with `setupFiles: ['dotenv/config']`.
  * Optionally `resolve.alias` if path aliases used.
  * Ensure Node 20 in engines.

* **Unit**:

  * `tests/llm.test.ts`:

    * invalid JSON reject
    * valid JSON pass
    * > MAX count clamp + warning
    * truncation of long fields
  * `tests/records.test.ts`:

    * create/list/update/delete; timestamps update
  * `tests/prompts.test.ts`:

    * upsert single-row semantics; timestamps update
  * `tests/http.test.ts`:

    * `problem()` shape/content-type

* **Route (light)**:

  * `tests/run-route.test.ts`:

    * mock `lib/llm.ts` call to return deterministic `{ records: [...] }`
    * success path writes prompt+records; returns warnings if configured
    * validation failure (prompt too long/empty) → 422
    * LLM failure → 502
    * wipe-after-validate semantics: on failure, prior state intact
  * `tests/records-routes.test.ts`:

    * POST validates and creates
    * PATCH partial update
    * DELETE removes
    * 404 on missing id

* **DB in tests**:

  * Set `SQLITE_PATH=":memory:"` or temp file in a `beforeAll`.
  * Clean state between tests.

**Accept:** Tests run locally; key behavior verified.

---

## 20) Vercel/Runtime gotchas (even if not deploying)

* Every route: `export const runtime = 'nodejs';`
* Avoid Edge-only APIs.
* FS is ephemeral on Vercel; local task assumes persistence—fine.
* Node version parity: use 20.x locally and in tests.

**Accept:** No accidental Edge runtime usage.

---

## 21) Developer Experience odds & ends

* Scripts in `package.json`:

  * `"dev": "next dev"`
  * `"build": "next build"`
  * `"start": "next start"`
  * `"test": "vitest --run"`
* Add a short `README.md`:

  * Setup (copy `.env.example` → `.env.local`, add API key)
  * Run commands
  * Notes on limits and standardized errors

**Accept:** New developer can follow README and run app.

---

## 22) Manual QA checklist

* Start with empty DB; page loads with empty records and empty prompt panel.
* Enter prompt (non-empty, under max) → Run:

  * Button disables; spinner shows
  * On success: records appear; warnings show if any; prompt panel updates
  * Textarea preserves typed value
* Try duplicate clicks: second click ignored during in-flight
* Try invalid prompt (empty or over max): 422 error message shown
* Edit record title only: saves and updates in-place; description unchanged
* Delete a record: removes from list
* Rerun with new prompt: old records replaced only after success; on LLM failure, old records remain

**Accept:** All checks pass.
