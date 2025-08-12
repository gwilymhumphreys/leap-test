import { describe, it, expect, beforeEach } from 'vitest';
import { parseAndValidate, applyGuards, buildMessages } from '../lib/llm.js';

describe('LLM validation', () => {
  beforeEach(() => {
    // Set test constants
    process.env.MAX_RECORDS_PER_RUN = '3';
    process.env.MAX_TITLE_CHARS = '20';
    process.env.MAX_DESCRIPTION_CHARS = '30';
  });

  describe('parseAndValidate()', () => {
    it('should reject invalid JSON', () => {
      expect(() => parseAndValidate('not json')).toThrow('Invalid JSON response from LLM');
      expect(() => parseAndValidate('{"invalid": json}')).toThrow('Invalid JSON response from LLM');
    });

    it('should accept valid JSON structure', () => {
      const validJson = JSON.stringify({
        records: [
          { title: 'Test Title', description: 'Test Description' }
        ]
      });

      const result = parseAndValidate(validJson);
      expect(result.records).toHaveLength(1);
      expect(result.records[0]).toEqual({
        title: 'Test Title',
        description: 'Test Description'
      });
    });

    it('should reject empty records array', () => {
      const emptyRecords = JSON.stringify({ records: [] });
      expect(() => parseAndValidate(emptyRecords)).toThrow('LLM response validation failed');
    });

    it('should reject missing records field', () => {
      const missingRecords = JSON.stringify({ data: [] });
      expect(() => parseAndValidate(missingRecords)).toThrow('LLM response validation failed');
    });

    it('should reject extra top-level keys', () => {
      const extraKeys = JSON.stringify({
        records: [{ title: 'Title', description: 'Description' }],
        extra: 'not allowed'
      });
      expect(() => parseAndValidate(extraKeys)).toThrow('LLM response validation failed');
    });

    it('should pick only title/description from records (ignore extra fields)', () => {
      const recordsWithExtras = JSON.stringify({
        records: [
          { 
            title: 'Title', 
            description: 'Description',
            extra: 'ignored',
            id: 123
          }
        ]
      });

      const result = parseAndValidate(recordsWithExtras);
      expect(result.records[0]).toEqual({
        title: 'Title',
        description: 'Description'
      });
      expect(result.records[0]).not.toHaveProperty('extra');
      expect(result.records[0]).not.toHaveProperty('id');
    });

    it('should reject empty title or description', () => {
      const emptyTitle = JSON.stringify({
        records: [{ title: '', description: 'Description' }]
      });
      expect(() => parseAndValidate(emptyTitle)).toThrow('LLM response validation failed');

      const emptyDescription = JSON.stringify({
        records: [{ title: 'Title', description: '' }]
      });
      expect(() => parseAndValidate(emptyDescription)).toThrow('LLM response validation failed');
    });

    it('should trim whitespace from title and description', () => {
      const withWhitespace = JSON.stringify({
        records: [{ title: '  Title  ', description: '  Description  ' }]
      });

      const result = parseAndValidate(withWhitespace);
      expect(result.records[0]).toEqual({
        title: 'Title',
        description: 'Description'
      });
    });
  });

  describe('applyGuards()', () => {
    it('should cap records to MAX_RECORDS_PER_RUN and add warning', () => {
      const manyRecords = Array.from({ length: 5 }, (_, i) => ({
        title: `Title ${i}`,
        description: `Description ${i}`
      }));

      const result = applyGuards(manyRecords);
      expect(result.records).toHaveLength(3); // MAX_RECORDS_PER_RUN = 3
      expect(result.warnings).toContain('2 records dropped (max=3)');
    });

    it('should not add warning when under limit', () => {
      const fewRecords = [
        { title: 'Title', description: 'Description' }
      ];

      const result = applyGuards(fewRecords);
      expect(result.records).toHaveLength(1);
      expect(result.warnings).not.toContain(expect.stringContaining('records dropped'));
    });

    it('should truncate long titles and descriptions', () => {
      const longRecords = [
        {
          title: 'This is a very long title that exceeds the maximum length',
          description: 'This is a very long description that also exceeds the maximum length allowed'
        }
      ];

      const result = applyGuards(longRecords);
      expect(result.records[0].title).toHaveLength(20); // MAX_TITLE_CHARS
      expect(result.records[0].description).toHaveLength(30); // MAX_DESCRIPTION_CHARS
      expect(result.warnings).toContain('2 fields truncated');
    });

    it('should not truncate short fields', () => {
      const shortRecords = [
        { title: 'Short', description: 'Also short' }
      ];

      const result = applyGuards(shortRecords);
      expect(result.records[0]).toEqual({ title: 'Short', description: 'Also short' });
      expect(result.warnings).not.toContain(expect.stringContaining('truncated'));
    });

    it('should combine record dropping and field truncation warnings', () => {
      const problematicRecords = Array.from({ length: 5 }, (_, i) => ({
        title: `This is a very long title ${i} that exceeds the limit`,
        description: `This is a very long description ${i} that also exceeds the limit`
      }));

      const result = applyGuards(problematicRecords);
      expect(result.records).toHaveLength(3);
      expect(result.warnings).toContain('2 records dropped (max=3)');
      expect(result.warnings).toContain('6 fields truncated'); // 3 records × 2 fields each
    });
  });

  describe('buildMessages()', () => {
    it('should create OpenAI-style messages array', () => {
      const messages = buildMessages('System prompt', 'User prompt');
      
      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({
        role: 'system',
        content: 'System prompt'
      });
      expect(messages[1]).toEqual({
        role: 'user',
        content: 'User prompt'
      });
    });
  });
});