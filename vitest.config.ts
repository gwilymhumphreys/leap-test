import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    setupFiles: ['dotenv/config'],
    environment: 'node'
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
});