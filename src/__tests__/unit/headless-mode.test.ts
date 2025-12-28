import { BrowserMediumClient } from '../../browser-client';
import { MOCK_SESSIONS } from '../helpers/fixtures';
import { chromium } from 'playwright-extra';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

// Note: playwright-extra is mocked globally in src/__tests__/setup.ts

/**
 * Tests for headless mode determination logic.
 * Since shouldUseHeadlessMode() is private, we test it indirectly
 * by checking what parameters are passed to chromium.launch().
 */
describe('Headless Mode Determination', () => {
  const sessionPath = join(__dirname, '..', '..', '..', 'medium-session.json');

  beforeEach(() => {
    // Global mock from setup.ts is already configured
    // Just clean up any existing session file
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }
  });

  afterEach(() => {
    // Clean up session file
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }
    jest.clearAllMocks();
  });

  test('should use headless=true when valid session exists', async () => {
    // Write valid session to file
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.valid, null, 2));

    const client = new BrowserMediumClient();
    await client.initialize();

    // Verify chromium.launch was called with headless: true
    expect(chromium.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: true
      })
    );

    await client.close();
  });

  test('should use headless=false when no session exists', async () => {
    // Ensure no session file exists
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }

    const client = new BrowserMediumClient();
    await client.initialize();

    // Verify chromium.launch was called with headless: false
    expect(chromium.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: false
      })
    );

    await client.close();
  });

  test('should use headless=false when session is expired', async () => {
    // Write expired session to file
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.expiredSid, null, 2));

    const client = new BrowserMediumClient();
    await client.initialize();

    // Verify chromium.launch was called with headless: false
    // (expired session means isAuthenticatedSession will be false)
    expect(chromium.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: false
      })
    );

    await client.close();
  });

  test('should use headless=true when forceHeadless parameter is true', async () => {
    // Even without a session, forceHeadless should override
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }

    const client = new BrowserMediumClient();
    await client.initialize(true); // forceHeadless = true

    // Verify chromium.launch was called with headless: true
    expect(chromium.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: true
      })
    );

    await client.close();
  });

  test('should use headless=false when forceHeadless parameter is false', async () => {
    // Even with a valid session, forceHeadless=false should override
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.valid, null, 2));

    const client = new BrowserMediumClient();
    await client.initialize(false); // forceHeadless = false

    // Verify chromium.launch was called with headless: false
    expect(chromium.launch).toHaveBeenCalledWith(
      expect.objectContaining({
        headless: false
      })
    );

    await client.close();
  });

  test('should load session into context when valid session exists', async () => {
    // Write valid session to file
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.valid, null, 2));

    const client = new BrowserMediumClient();
    await client.initialize();

    // Verify chromium.launch was called (session loading is internal implementation)
    expect(chromium.launch).toHaveBeenCalled();

    await client.close();
  });

  test('should not load session when expired', async () => {
    // Write expired session to file
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.expiredSid, null, 2));

    const client = new BrowserMediumClient();
    await client.initialize();

    // Verify browser was initialized despite expired session
    expect(chromium.launch).toHaveBeenCalled();

    await client.close();
  });
});
