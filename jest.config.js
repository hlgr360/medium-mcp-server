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

  // Prevent coverage regression (baseline established Dec 2024)
  coverageThreshold: {
    global: {
      statements: 47,
      branches: 45,
      functions: 50,
      lines: 47
    }
  },

  // Reporters
  reporters: ['default'],

  // Global test setup - mocks playwright-extra to prevent browser launches
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],

  // Run tests sequentially (single worker)
  maxWorkers: 1,

  // Timeouts and cleanup
  testTimeout: 10000,
  clearMocks: true,           // Clear call history between tests
  resetMocks: false,          // Don't reset mock implementations (keeps global mock working)
  restoreMocks: true,         // Restore original implementations for spies

  // ts-jest configuration (modern syntax)
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json'
    }]
  }
};
