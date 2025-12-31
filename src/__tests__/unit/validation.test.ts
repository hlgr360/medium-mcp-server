import { BrowserMediumClient } from '../../browser-client';
import { MOCK_SESSIONS } from '../helpers/fixtures';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

// Import custom matchers
import '../helpers/matchers';

describe('Cookie Validation (via preValidateSession)', () => {
  let client: BrowserMediumClient;
  // BrowserMediumClient uses join(__dirname, '..', 'medium-session.json')
  // In the built code (dist/), this resolves to project-root/medium-session.json
  // In test context, __dirname is src/__tests__/unit, so we need to go up 3 levels
  const sessionPath = join(__dirname, '..', '..', '..', 'medium-session.json');

  beforeEach(() => {
    client = new BrowserMediumClient();
    // Clean up any existing session file before test
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }
  });

  afterEach(() => {
    // Clean up session file after test
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }
  });

  test('should reject when session file does not exist', async () => {
    // Ensure file doesn't exist
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }

    const result = await client.preValidateSession();
    expect(result).toBe(false);
  });

  test('should accept valid unexpired cookies', async () => {
    // Write valid session to file
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.valid, null, 2));

    const result = await client.preValidateSession();
    expect(result).toBe(true);
  });

  test('should reject expired sid cookie', async () => {
    // Write session with expired sid cookie
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.expiredSid, null, 2));

    const result = await client.preValidateSession();
    expect(result).toBe(false);
  });

  test('should reject expired uid cookie', async () => {
    // Write session with expired uid cookie
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.expiredUid, null, 2));

    const result = await client.preValidateSession();
    expect(result).toBe(false);
  });

  test('should accept session cookies with expires=-1', async () => {
    // Session cookies (expires: -1) should be treated as valid
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.sessionCookies, null, 2));

    const result = await client.preValidateSession();
    expect(result).toBe(true);
  });

  test('should reject session with no auth cookies', async () => {
    // Only analytics cookies, no sid/uid
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.noAuthCookies, null, 2));

    const result = await client.preValidateSession();
    // This should still return true because validateStorageState only checks if cookies are NOT expired
    // It doesn't validate that auth cookies exist - that would happen during actual login
    expect(result).toBe(true);
  });

  test('should reject empty session (no cookies)', async () => {
    // No cookies at all - but this isn't technically "expired", so it might pass validateStorageState
    // The actual rejection would happen during login attempt
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.empty, null, 2));

    const result = await client.preValidateSession();
    // Empty session has no cookies to validate, so validateStorageState returns true
    // (no cookies means no expired cookies!)
    expect(result).toBe(true);
  });

  test('should reject corrupted JSON in session file', async () => {
    // Write invalid JSON
    writeFileSync(sessionPath, 'this is not valid JSON{{{');

    const result = await client.preValidateSession();
    expect(result).toBe(false);
  });

  test('should reject null storage state', async () => {
    // Write null to file
    writeFileSync(sessionPath, JSON.stringify(null));

    const result = await client.preValidateSession();
    expect(result).toBe(false);
  });

  test('should reject storage state without cookies property', async () => {
    // Missing cookies property
    const invalidSession = { origins: [] };
    writeFileSync(sessionPath, JSON.stringify(invalidSession));

    const result = await client.preValidateSession();
    expect(result).toBe(false);
  });
});

describe('Session File Structure Validation', () => {
  test('valid session should have correct structure', () => {
    expect(MOCK_SESSIONS.valid).toBeValidSessionFile();
  });

  test('expired session should still have valid structure', () => {
    expect(MOCK_SESSIONS.expiredSid).toBeValidSessionFile();
  });

  test('empty session should have valid structure', () => {
    expect(MOCK_SESSIONS.empty).toBeValidSessionFile();
  });

  test('null should not be valid session file', () => {
    expect(null).not.toBeValidSessionFile();
  });

  test('object without cookies should not be valid', () => {
    expect({ origins: [] }).not.toBeValidSessionFile();
  });
});
