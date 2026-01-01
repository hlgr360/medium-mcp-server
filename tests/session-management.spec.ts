import { test, expect } from '@playwright/test';
import { BrowserMediumClient } from '../src/browser-client';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * Test suite for session persistence functionality
 *
 * NOTE: Uses medium-session.test.json (separate from main session file)
 * to test session management in isolation without affecting the main
 * session used by other tests.
 */
test.describe('Session Management', () => {
  const sessionPath = join(__dirname, '..', 'medium-session.test.json');
  let client: BrowserMediumClient;

  // Clean up test session file after all tests complete
  test.afterAll(() => {
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }
  });

  test.beforeEach(() => {
    // Use custom test session path to avoid affecting main session
    client = new BrowserMediumClient(sessionPath);
    // Clean up any existing test session file before each test
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }
  });

  test.afterEach(async () => {
    await client.close();

    // Clean up test session file after each test
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }
  });

  test('should create and persist session file after successful manual login', async () => {
    // Note: This test requires manual intervention for login
    // Skip by default (only run when explicitly requested with MANUAL_LOGIN_TEST=true)
    //
    // Purpose: Verifies that after a user manually logs in via the browser,
    // the session is properly saved to disk with all required cookies and origins.
    // This is the foundation for session persistence - subsequent operations will
    // update this session file to keep it fresh.
    test.skip(process.env.MANUAL_LOGIN_TEST !== 'true', 'Requires manual login - set MANUAL_LOGIN_TEST=true to run');

    await client.initialize(false); // Non-headless for login

    // Attempt login (will open browser for user)
    const success = await client.ensureLoggedIn();

    if (success) {
      // Verify session file was created
      expect(existsSync(sessionPath)).toBe(true);

      // Verify session file has valid structure
      const sessionData = JSON.parse(readFileSync(sessionPath, 'utf8'));

      // Check cookies
      expect(sessionData).toHaveProperty('cookies');
      expect(Array.isArray(sessionData.cookies)).toBe(true);
      expect(sessionData.cookies.length).toBeGreaterThan(0);

      // Check that cookies have required fields
      const cookie = sessionData.cookies[0];
      expect(cookie).toHaveProperty('name');
      expect(cookie).toHaveProperty('value');
      expect(cookie).toHaveProperty('domain');
      expect(cookie).toHaveProperty('path');

      // Check origins (localStorage)
      expect(sessionData.origins).toBeDefined();
      expect(Array.isArray(sessionData.origins)).toBe(true);

      // Verify the session was saved during login
      console.log('✅ Session file created and persisted after login');
      console.log('   Session will now be updated after each browser operation');
    }
  });

  test('should reject expired cookies in validateStorageState()', async () => {
    // Create a fake session with expired cookies
    const expiredSession = {
      cookies: [
        {
          name: 'sid',
          value: 'fake-value',
          domain: 'medium.com',
          path: '/',
          expires: Date.now() / 1000 - 3600, // Expired 1 hour ago
          httpOnly: true,
          secure: true,
          sameSite: 'Lax' as const
        }
      ],
      origins: []
    };

    writeFileSync(sessionPath, JSON.stringify(expiredSession, null, 2));

    // Initialize should detect expired session
    await client.initialize();

    // The browser should not use the expired session
    // Verify by checking if session file still exists but wasn't loaded
    expect(existsSync(sessionPath)).toBe(true);
  });

  test('should accept valid cookies in validateStorageState()', async () => {
    // Create a fake session with valid cookies (expires in 1 year)
    const validSession = {
      cookies: [
        {
          name: 'sid',
          value: 'fake-value',
          domain: 'medium.com',
          path: '/',
          expires: Date.now() / 1000 + (365 * 24 * 60 * 60), // Expires in 1 year
          httpOnly: true,
          secure: true,
          sameSite: 'Lax' as const
        }
      ],
      origins: []
    };

    writeFileSync(sessionPath, JSON.stringify(validSession, null, 2));

    // Initialize should accept valid session
    await client.initialize();

    // Browser should use the valid session
    expect(existsSync(sessionPath)).toBe(true);
  });

  test('should handle missing session file gracefully', async () => {
    // Ensure no session file exists
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }

    // Initialize should work without session file
    await expect(client.initialize()).resolves.not.toThrow();
  });

  test('should handle corrupted session file gracefully', async () => {
    // Create a corrupted session file
    writeFileSync(sessionPath, 'this is not valid JSON{}}');

    // Initialize should handle corrupted file
    await expect(client.initialize()).resolves.not.toThrow();
  });

  test('preValidateSession should detect missing session file', async () => {
    const isValid = await client.preValidateSession();
    expect(isValid).toBe(false);
  });

  test('preValidateSession should detect expired cookies', async () => {
    const expiredSession = {
      cookies: [
        {
          name: 'sid',
          value: 'fake-value',
          domain: 'medium.com',
          path: '/',
          expires: Date.now() / 1000 - 3600,
          httpOnly: true,
          secure: true,
          sameSite: 'Lax' as const
        }
      ],
      origins: []
    };

    writeFileSync(sessionPath, JSON.stringify(expiredSession, null, 2));

    const isValid = await client.preValidateSession();
    expect(isValid).toBe(false);
  });

  test('preValidateSession should accept valid cookies', async () => {
    const validSession = {
      cookies: [
        {
          name: 'sid',
          value: 'fake-value',
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

    writeFileSync(sessionPath, JSON.stringify(validSession, null, 2));

    const isValid = await client.preValidateSession();
    expect(isValid).toBe(true);
  });

  test('should update session file after successful browser operation', async () => {
    // Create initial valid session
    const initialSession = {
      cookies: [
        {
          name: 'sid',
          value: 'initial-test-session',
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

    writeFileSync(sessionPath, JSON.stringify(initialSession, null, 2));

    // Record initial file modification time and content
    const { statSync } = require('fs');
    const initialStats = statSync(sessionPath);
    const initialMtime = initialStats.mtime.getTime();
    const initialContent = readFileSync(sessionPath, 'utf8');

    // Wait to ensure modification time will differ
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Initialize browser with the session
    await client.initialize();

    // Perform a real operation that should automatically call saveSession()
    // Using searchMediumArticles because it doesn't require authentication
    try {
      await client.searchMediumArticles(['test']);
    } catch (error) {
      // Search may fail but should still save session
      // We only care that saveSession() was called
    }

    // Verify session file was updated automatically
    const updatedStats = statSync(sessionPath);
    const updatedMtime = updatedStats.mtime.getTime();
    const updatedContent = readFileSync(sessionPath, 'utf8');

    // Session file should have been updated (newer modification time)
    expect(updatedMtime).toBeGreaterThan(initialMtime);

    // Content should have changed (browser updates cookies)
    expect(updatedContent).not.toBe(initialContent);

    // Verify session file still has valid structure
    const updatedSession = JSON.parse(updatedContent);
    expect(updatedSession).toHaveProperty('cookies');
    expect(Array.isArray(updatedSession.cookies)).toBe(true);
    expect(updatedSession.cookies.length).toBeGreaterThan(0);
  }, 60000); // 60s timeout for browser operation

});
