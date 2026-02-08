const { defineConfig } = require('vitest/config');

module.exports = defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['db/**/*.js', 'routes/**/*.js'],
      exclude: ['**/node_modules/**', '**/tests/**']
    },
    testTimeout: 15000,
    hookTimeout: 15000
  }
});
