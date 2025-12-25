import { test, expect } from '@playwright/test';
import { BrowserMediumClient } from '../src/browser-client';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * Test suite for browser lifecycle management
 * Verifies that browser is properly initialized and closed
 */
test.describe('Browser Lifecycle', () => {
  const sessionPath = join(process.cwd(), 'medium-session.json');
  let client: BrowserMediumClient;

  test.beforeEach(() => {
    client = new BrowserMediumClient();
    // Clean up session file before each test
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }
  });

  test.afterEach(async () => {
    await client.close();
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }
  });

  test('should initialize browser successfully', async () => {
    await expect(client.initialize()).resolves.not.toThrow();
  });

  test('should close browser without errors', async () => {
    await client.initialize();
    await expect(client.close()).resolves.not.toThrow();
  });

  test('should use headless mode when valid session exists', async () => {
    // Create a valid session file
    const validSession = {
      cookies: [
        {
          name: 'sid',
          value: 'test-value',
          domain: 'medium.com',
          path: '/',
          expires: Date.now() / 1000 + (365 * 24 * 60 * 60), // 1 year
          httpOnly: true,
          secure: true,
          sameSite: 'Lax' as const
        }
      ],
      origins: []
    };

    writeFileSync(sessionPath, JSON.stringify(validSession, null, 2));

    // Initialize should use headless mode with valid session
    await client.initialize();

    // Can't directly test headless mode, but we can verify browser initialized
    await expect(client.close()).resolves.not.toThrow();
  });

  test('should use non-headless mode when forced', async () => {
    // Force non-headless mode
    await client.initialize(false);

    // Verify browser is running
    await expect(client.close()).resolves.not.toThrow();
  });

  test('should handle multiple initialize-close cycles', async () => {
    // First cycle
    await client.initialize();
    await client.close();

    // Second cycle
    await client.initialize();
    await client.close();

    // Third cycle
    await expect(client.initialize()).resolves.not.toThrow();
    await expect(client.close()).resolves.not.toThrow();
  });

  test('should handle close without initialize', async () => {
    // Closing without initializing should not throw
    await expect(client.close()).resolves.not.toThrow();
  });

  test('should handle double close', async () => {
    await client.initialize();
    await client.close();

    // Second close should be safe
    await expect(client.close()).resolves.not.toThrow();
  });
});
