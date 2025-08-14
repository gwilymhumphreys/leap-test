import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('API Routes', () => {
  beforeEach(async () => {
    // Use in-memory database for tests
    process.env.SQLITE_PATH = ':memory:';
    process.env.OPENAI_API_KEY = 'test-key';
    process.env.MAX_PROMPT_CHARS = '2000';
    process.env.MAX_TITLE_CHARS = '200';
    process.env.MAX_DESCRIPTION_CHARS = '2000';
    process.env.MAX_RECORDS_PER_RUN = '50';
  });

  afterEach(async () => {
    // Reset database state
    const { resetDatabase } = await import('../lib/db.js');
    resetDatabase();
    delete process.env.SQLITE_PATH;
    delete process.env.OPENAI_API_KEY;
    delete process.env.MAX_PROMPT_CHARS;
    delete process.env.MAX_TITLE_CHARS;
    delete process.env.MAX_DESCRIPTION_CHARS;
    delete process.env.MAX_RECORDS_PER_RUN;
    vi.clearAllMocks();
    vi.resetModules();
  });

  describe('GET /api/prompt', () => {
    it('should return empty prompt initially', async () => {
      const { GET } = await import('../app/api/prompt/route.js');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ prompt: null });
    });

    it('should return existing prompt', async () => {
      const { upsertPrompt } = await import('../lib/prompts.js');
      const { GET } = await import('../app/api/prompt/route.js');

      await upsertPrompt('test prompt');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.prompt.text).toBe('test prompt');
    });
  });

  describe('GET /api/records', () => {
    it('should return empty records initially', async () => {
      const { GET } = await import('../app/api/records/route.js');
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ records: [] });
    });

    it('should return existing records', async () => {
      const { createRecord } = await import('../lib/records.js');
      const { GET } = await import('../app/api/records/route.js');

      await createRecord({ title: 'Test Record', description: 'Test Description' });
      const response = await GET();
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.records).toHaveLength(1);
      expect(data.records[0].title).toBe('Test Record');
    });
  });

  describe('POST /api/records', () => {
    it('should create record successfully', async () => {
      const { POST } = await import('../app/api/records/route.js');
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Record', description: 'New Description' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.record.title).toBe('New Record');
      expect(data.record.description).toBe('New Description');
    });

    it('should return 400 for invalid JSON', async () => {
      const { POST } = await import('../app/api/records/route.js');
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'invalid json'
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(400);
      expect(data.title).toBe('Bad request');
    });

    it('should return 422 for validation errors', async () => {
      const { POST } = await import('../app/api/records/route.js');
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: '', description: '' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.title).toBe('Validation error');
      expect(data.fields).toHaveProperty('title');
      expect(data.fields).toHaveProperty('description');
    });

    it('should truncate long fields', async () => {
      const { POST } = await import('../app/api/records/route.js');
      const longTitle = 'x'.repeat(250);
      const longDescription = 'y'.repeat(2100);
      
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: longTitle, description: longDescription })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(201);
      expect(data.record.title).toHaveLength(200);
      expect(data.record.description).toHaveLength(2000);
    });
  });

  describe('PATCH /api/records/[id]', () => {
    it('should update record successfully', async () => {
      const { createRecord } = await import('../lib/records.js');
      const { PATCH } = await import('../app/api/records/[id]/route.js');

      const record = await createRecord({ title: 'Original', description: 'Original Description' });
      const request = new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' })
      });

      const response = await PATCH(request, { params: { id: record.id.toString() } } as any);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.record.title).toBe('Updated');
      expect(data.record.description).toBe('Original Description');
    });

    it('should return 404 for non-existent record', async () => {
      const { PATCH } = await import('../app/api/records/[id]/route.js');
      const request = new Request('http://localhost', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Updated' })
      });

      const response = await PATCH(request, { params: { id: '999' } } as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.title).toBe('Record not found');
    });
  });

  describe('DELETE /api/records/[id]', () => {
    it('should delete record successfully', async () => {
      const { createRecord } = await import('../lib/records.js');
      const { DELETE } = await import('../app/api/records/[id]/route.js');

      const record = await createRecord({ title: 'To Delete', description: 'Will be deleted' });
      const request = new Request('http://localhost', { method: 'DELETE' });

      const response = await DELETE(request, { params: { id: record.id.toString() } } as any);

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent record', async () => {
      const { DELETE } = await import('../app/api/records/[id]/route.js');
      const request = new Request('http://localhost', { method: 'DELETE' });

      const response = await DELETE(request, { params: { id: '999' } } as any);
      const data = await response.json();

      expect(response.status).toBe(404);
      expect(data.title).toBe('Record not found');
    });
  });

  describe('POST /api/run', () => {
    beforeEach(() => {
      // Mock LLM functions
      vi.doMock('../lib/llm.js', () => ({
        buildMessages: vi.fn(() => [{ role: 'user', content: 'test' }]),
        callLlm: vi.fn(() => Promise.resolve('{"records":[{"title":"Test","description":"Test Description"}]}')),
        parseAndValidate: vi.fn(() => ({ records: [{ title: 'Test', description: 'Test Description' }] })),
        applyGuards: vi.fn((records) => ({ records, warnings: [] }))
      }));

      // Mock system prompt functions
      vi.doMock('../lib/systemPrompt.js', () => ({
        getSystemPromptText: vi.fn(() => 'system prompt'),
        getModel: vi.fn(() => 'gpt-4')
      }));
    });

    it('should execute LLM run successfully', async () => {
      const { POST } = await import('../app/api/run/route.js');
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'generate records' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data.records).toHaveLength(1);
      expect(data.records[0].title).toBe('Test');
      expect(data.prompt.text).toBe('generate records');
    });

    it('should return 422 for empty prompt', async () => {
      const { POST } = await import('../app/api/run/route.js');
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: '' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.title).toBe('Validation error');
      expect(data.fields.prompt).toBe('Cannot be empty');
    });

    it('should return 422 for prompt too long', async () => {
      const { POST } = await import('../app/api/run/route.js');
      const longPrompt = 'x'.repeat(2001);
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: longPrompt })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(422);
      expect(data.title).toBe('Validation error');
      expect(data.detail).toContain('exceeds maximum length');
    });

    it('should return 502 for LLM call failure', async () => {
      // Mock LLM call to fail
      vi.doMock('../lib/llm.js', () => ({
        buildMessages: vi.fn(() => [{ role: 'user', content: 'test' }]),
        callLlm: vi.fn(() => Promise.reject(new Error('API rate limit exceeded'))),
        parseAndValidate: vi.fn(),
        applyGuards: vi.fn()
      }));

      // Need to clear and re-import the route to pick up the mock
      vi.resetModules();
      const { POST } = await import('../app/api/run/route.js');
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'generate records' })
      });

      const response = await POST(request);
      const data = await response.json();

      expect(response.status).toBe(502);
      expect(data.title).toBe('LLM request failed');
      expect(data.detail).toContain('API rate limit exceeded');
    });

    it('should preserve existing data on LLM failure (wipe-after-validate)', async () => {
      const { createRecord } = await import('../lib/records.js');
      const { listRecords } = await import('../lib/records.js');

      // Create existing record
      await createRecord({ title: 'Existing', description: 'Should be preserved' });

      // Mock LLM call to fail
      vi.doMock('../lib/llm.js', () => ({
        buildMessages: vi.fn(() => [{ role: 'user', content: 'test' }]),
        callLlm: vi.fn(() => Promise.reject(new Error('LLM failed'))),
        parseAndValidate: vi.fn(),
        applyGuards: vi.fn()
      }));

      // Need to clear and re-import the route to pick up the mock
      vi.resetModules();
      const { POST } = await import('../app/api/run/route.js');
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: 'generate records' })
      });

      const response = await POST(request);
      expect(response.status).toBe(502);

      // Verify existing data is preserved
      const records = await listRecords();
      expect(records).toHaveLength(1);
      expect(records[0].title).toBe('Existing');
    });
  });
});