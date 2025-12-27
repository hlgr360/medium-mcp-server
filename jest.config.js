module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',

  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.ts',
    '**/?(*.)+(spec|test).ts'
  ],

  // Exclude Playwright E2E tests and scripts
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/tests/',      // Playwright tests
    '/scripts/'     // Old test scripts
  ],

  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts'  // Entry point tested via integration
  ],

  // No coverage threshold yet (establish baseline first)
  // coverageThreshold: {},  // Commented out - will add after baseline established

  // Reporters
  reporters: ['default'],

  // Run tests sequentially (single worker)
  maxWorkers: 1,

  // Timeouts and cleanup
  testTimeout: 10000,
  clearMocks: true,
  resetMocks: true,
  restoreMocks: true,

  // ts-jest configuration
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.test.json'
    }
  }
};
