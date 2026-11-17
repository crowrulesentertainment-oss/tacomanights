const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.cjs',
  timeout: 30000,
  retries: 1,
  reporter: 'list',
  use: {
    headless: true,
    actionTimeout: 10000,
    navigationTimeout: 20000
  }
});
