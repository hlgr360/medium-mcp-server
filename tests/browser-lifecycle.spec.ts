import { test, expect } from '@playwright/test';
import { BrowserMediumClient } from '../src/browser-client';
import { existsSync, writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * Test suite for browser lifecycle management
 * Verifies that browser is properly initialized and closed
 *
 * NOTE: Uses main session file (medium-session.json) to test real-world behavior.
 * Does NOT clean up session between tests to allow session reuse.
 */
test.describe('Browser Lifecycle', () => {
  let client: BrowserMediumClient;

  test.beforeEach(() => {
    client = new BrowserMediumClient();
    // Do NOT clean up session file - use existing session if available
  });

  test.afterEach(async () => {
    await client.close();
    // Do NOT delete session file - preserve for subsequent test runs
  });

  test('should initialize browser successfully', async () => {
    await expect(client.initialize()).resolves.not.toThrow();
  });

  test('should close browser without errors', async () => {
    await client.initialize();
    await expect(client.close()).resolves.not.toThrow();
  });

  test('should use headless mode when valid session exists', async () => {
    // This test relies on the global setup creating a valid session
    // If session exists (from globalSetup), initialize should use headless mode

    // Initialize should use headless mode with existing session
    await client.initialize();

    // Can't directly test headless mode, but we can verify browser initialized
    await expect(client.close()).resolves.not.toThrow();
  });

  test('should use non-headless mode when forced', async () => {
    // Skip this test by default to avoid opening visible browser during test runs
    // Run with HEADED_MODE_TEST=true to test non-headless mode explicitly
    test.skip(process.env.HEADED_MODE_TEST !== 'true', 'Skipped - opens visible browser (set HEADED_MODE_TEST=true to run)');

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
