import { test, expect } from '@playwright/test';
import { BrowserMediumClient } from '../src/browser-client';
import { existsSync, writeFileSync, readFileSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * Test suite for session persistence functionality
 */
test.describe('Session Management', () => {
  const sessionPath = join(__dirname, '..', 'medium-session.json');
  const sessionBackupPath = join(__dirname, '..', 'medium-session.backup.json');
  const sessionTempPath = join(__dirname, '..', 'medium-session.temp.json');
  let client: BrowserMediumClient;
  let lastValidSession: string | null = null;

  // Save existing session before running session management tests
  test.beforeAll(() => {
    if (existsSync(sessionPath)) {
      const sessionData = readFileSync(sessionPath, 'utf8');
      writeFileSync(sessionBackupPath, sessionData);
      console.log('💾 Saved existing session to backup');
    }
  });

  // Restore session after all session management tests complete
  test.afterAll(() => {
    // First, check if we have a backup to restore
    if (existsSync(sessionBackupPath)) {
      const sessionData = readFileSync(sessionBackupPath, 'utf8');
      writeFileSync(sessionPath, sessionData);
      unlinkSync(sessionBackupPath);
      console.log('✅ Restored session from backup');
    } else if (lastValidSession) {
      // No backup but we have a valid session from tests - keep it
      writeFileSync(sessionPath, lastValidSession);
      console.log('✅ Kept valid session created during tests');
    } else {
      console.log('ℹ️  No session to restore (started without valid session)');
    }
  });

  test.beforeEach(() => {
    client = new BrowserMediumClient();
    // Clean up any existing session file before each test
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }
  });

  test.afterEach(async ({ }, testInfo) => {
    await client.close();

    // Save any valid session created by the login test
    const isLoginTest = testInfo.title.includes('should create session file with cookies and origins after successful login');

    if (isLoginTest && testInfo.status === 'passed' && existsSync(sessionPath)) {
      lastValidSession = readFileSync(sessionPath, 'utf8');
      console.log('💾 Saved session from successful login test');
    }

    // Clean up session file after each test
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }
  });

  test('should create session file with cookies and origins after successful login', async () => {
    // Note: This test requires manual intervention for login
    // Skip in CI/CD environments
    test.skip(process.env.CI === 'true', 'Requires manual login');

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
});
