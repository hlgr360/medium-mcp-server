import { BrowserMediumClient } from '../../browser-client';
import { MOCK_SESSIONS } from '../helpers/fixtures';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Tests for cookie expiry detection logic.
 * Since getEarliestCookieExpiry() is private, we test it indirectly
 * through saveSession() which logs the earliest expiry date.
 */
describe('Cookie Expiry Detection', () => {
  const sessionPath = join(__dirname, '..', '..', '..', 'medium-session.json');

  afterEach(() => {
    // Clean up session file after each test
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }
  });

  test('should detect valid session has future expiry', async () => {
    // Write valid session with future expiry
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.valid, null, 2));

    const client = new BrowserMediumClient();
    const result = await client.preValidateSession();

    expect(result).toBe(true);
    // The session should be accepted because all cookies expire in the future
  });

  test('should detect expired cookies', async () => {
    // Write session with expired sid cookie
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.expiredSid, null, 2));

    const client = new BrowserMediumClient();
    const result = await client.preValidateSession();

    expect(result).toBe(false);
    // The session should be rejected because sid cookie is expired
  });

  test('should handle session cookies (expires=-1)', async () => {
    // Session cookies don't have expiry timestamps
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.sessionCookies, null, 2));

    const client = new BrowserMediumClient();
    const result = await client.preValidateSession();

    expect(result).toBe(true);
    // Session cookies (expires: -1) should be treated as valid
  });

  test('should handle empty session (no cookies)', async () => {
    // Empty session has no cookies to check expiry
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.empty, null, 2));

    const client = new BrowserMediumClient();
    const result = await client.preValidateSession();

    expect(result).toBe(true);
    // Empty session has no cookies, so no expired cookies
  });

  test('should handle mixed expired and valid cookies', async () => {
    // Create a session with mix of expired and valid cookies
    const mixedSession = {
      cookies: [
        {
          name: 'sid',
          value: 'expired',
          domain: 'medium.com',
          path: '/',
          expires: Date.now() / 1000 - 3600, // Expired 1 hour ago
          httpOnly: true,
          secure: true,
          sameSite: 'Lax' as const
        },
        {
          name: '_ga',
          value: 'valid',
          domain: 'medium.com',
          path: '/',
          expires: Date.now() / 1000 + (30 * 24 * 60 * 60), // Valid for 30 days
          httpOnly: false,
          secure: false,
          sameSite: 'Lax' as const
        }
      ],
      origins: []
    };

    writeFileSync(sessionPath, JSON.stringify(mixedSession, null, 2));

    const client = new BrowserMediumClient();
    const result = await client.preValidateSession();

    expect(result).toBe(false);
    // Should reject because critical auth cookie (sid) is expired
  });

  test('should ignore non-auth cookie expiry', async () => {
    // Create session with only expired analytics cookies (not critical)
    const analyticsExpired = {
      cookies: [
        {
          name: '_ga',
          value: 'expired',
          domain: 'medium.com',
          path: '/',
          expires: Date.now() / 1000 - 3600, // Expired
          httpOnly: false,
          secure: false,
          sameSite: 'Lax' as const
        },
        {
          name: '_gid',
          value: 'expired',
          domain: 'medium.com',
          path: '/',
          expires: Date.now() / 1000 - 1800, // Expired
          httpOnly: false,
          secure: false,
          sameSite: 'Lax' as const
        }
      ],
      origins: []
    };

    writeFileSync(sessionPath, JSON.stringify(analyticsExpired, null, 2));

    const client = new BrowserMediumClient();
    const result = await client.preValidateSession();

    expect(result).toBe(true);
    // Should accept because only analytics cookies expired, no auth cookies
  });

  test('should handle cookies with expires=0', async () => {
    // Cookies with expires: 0 should be treated as session cookies
    const zeroExpiry = {
      cookies: [
        {
          name: 'sid',
          value: 'session',
          domain: 'medium.com',
          path: '/',
          expires: 0, // Session cookie
          httpOnly: true,
          secure: true,
          sameSite: 'Lax' as const
        }
      ],
      origins: []
    };

    writeFileSync(sessionPath, JSON.stringify(zeroExpiry, null, 2));

    const client = new BrowserMediumClient();
    const result = await client.preValidateSession();

    expect(result).toBe(true);
    // Should accept session cookies (expires: 0)
  });
});
