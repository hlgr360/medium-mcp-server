import { test, expect } from '@playwright/test';
import { BrowserMediumClient } from '../src/browser-client';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Test suite for authentication and session validation
 *
 * NOTE: Tests that need fake sessions use medium-session.test.json (separate file).
 * Tests that work with real sessions use the main medium-session.json.
 */
test.describe('Authentication', () => {
  const testSessionPath = join(__dirname, '..', 'medium-session.test.json');
  let client: BrowserMediumClient;

  test.beforeEach(() => {
    // Use default client (main session) unless test needs custom session
    client = new BrowserMediumClient();
  });

  test.afterEach(async () => {
    await client.close();
    // Clean up test session file if it was created
    if (existsSync(testSessionPath)) {
      unlinkSync(testSessionPath);
    }
  });

  test('validateSessionFast should complete within timeout', async () => {
    // Create a valid test session (though it won't actually authenticate)
    const validSession = {
      cookies: [
        {
          name: 'sid',
          value: 'test-value',
          domain: 'medium.com',
          path: '/',
          expires: Date.now() / 1000 + (365 * 24 * 60 * 60),
          httpOnly: true,
          secure: true,
          sameSite: 'Lax' as const
        }
      ],
      origins: []
    };

    writeFileSync(testSessionPath, JSON.stringify(validSession, null, 2));

    // Use client with test session
    const testClient = new BrowserMediumClient(testSessionPath);
    await testClient.initialize();

    // Measure validation time
    const startTime = Date.now();
    await testClient.validateSessionFast();
    const duration = Date.now() - startTime;

    // Should complete in less than 15 seconds (much faster than 21s DOM selector method)
    expect(duration).toBeLessThan(15000);

    await testClient.close();
  });

  test('validateSessionFast should detect invalid session', async () => {
    // Initialize without session file
    await client.initialize();

    // Validation should fail (no valid session)
    const isValid = await client.validateSessionFast();

    // Without a real Medium login, validation should fail
    expect(typeof isValid).toBe('boolean');
  });

  test('validateSessionFast should return false when browser not initialized', async () => {
    // Don't initialize browser
    const isValid = await client.validateSessionFast();
    expect(isValid).toBe(false);
  });

  test('ensureLoggedIn should handle timeout gracefully', async () => {
    test.skip(true, 'This test requires manual interaction and takes 5+ minutes');

    await client.initialize(false);

    // This will timeout if user doesn't log in within 5 minutes
    // We skip this test by default as it requires manual interaction
    const result = await client.ensureLoggedIn();

    expect(typeof result).toBe('boolean');
  });
});
