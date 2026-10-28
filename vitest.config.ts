import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    env: {
      NODE_ENV: 'test',
      PORT: '3000',
      DB_HOST: 'localhost',
      DB_PORT: '5432',
      DB_USER: 'postgres',
      DB_PASSWORD: 'pawan',
      DB_NAME: 'express_app_test',
      PASS_PERCENTAGE: '40',
      ACADEMIC_YEAR: '2026-27',
    },
  },
});
