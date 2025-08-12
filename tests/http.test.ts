import { describe, it, expect } from 'vitest';
import { problem, ok } from '../lib/http.js';

describe('HTTP helpers', () => {
  describe('problem()', () => {
    it('should create a Response with application/problem+json content type', async () => {
      const response = problem(422, 'Validation error', 'Something went wrong');
      
      expect(response.status).toBe(422);
      expect(response.headers.get('Content-Type')).toBe('application/problem+json');
      
      const body = await response.json();
      expect(body).toMatchObject({
        type: expect.stringContaining('https://errors.local/'),
        title: 'Validation error',
        status: 422,
        detail: 'Something went wrong',
        errorId: expect.any(String)
      });
      expect(body.errorId).toMatch(/^[a-z0-9]{6}$/);
    });

    it('should include fields when provided', async () => {
      const response = problem(422, 'Validation error', 'Invalid fields', {
        fields: { email: 'Required field', name: 'Too long' }
      });
      
      const body = await response.json();
      expect(body.fields).toEqual({
        email: 'Required field',
        name: 'Too long'
      });
    });

    it('should use custom type when provided', async () => {
      const response = problem(404, 'Not Found', 'Resource not found', {
        type: 'https://errors.local/custom'
      });
      
      const body = await response.json();
      expect(body.type).toBe('https://errors.local/custom');
    });
  });

  describe('ok()', () => {
    it('should create a JSON response with 200 status', async () => {
      const data = { message: 'Success', id: 123 };
      const response = ok(data);
      
      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      
      const body = await response.json();
      expect(body).toEqual(data);
    });

    it('should accept response init overrides', async () => {
      const data = { created: true };
      const response = ok(data, { status: 201 });
      
      expect(response.status).toBe(201);
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });
});