import { BrowserMediumClient } from '../../browser-client';
import { MOCK_SESSIONS } from '../helpers/fixtures';
import { MockPlaywrightFactory } from '../helpers/mock-playwright';
import { chromium } from 'playwright';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

// Mock the chromium.launch method
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn()
  }
}));

/**
 * Tests for headless mode determination logic.
 * Since shouldUseHeadlessMode() is private, we test it indirectly
 * by checking what parameters are passed to chromium.launch().
 */
describe('Headless Mode Determination', () => {
  const sessionPath = join(__dirname, '..', '..', '..', 'medium-session.json');
  let mockFactory: MockPlaywrightFactory;
  let mockBrowser: any;
  let mockContext: any;
  let mockPage: any;

  beforeEach(() => {
    mockFactory = new MockPlaywrightFactory();
    mockPage = mockFactory.createMockPage();
    mockContext = mockFactory.createMockContext({
      newPage: jest.fn().mockResolvedValue(mockPage)
    });
    mockBrowser = mockFactory.createMockBrowser({
      newContext: jest.fn().mockResolvedValue(mockContext),
      contexts: jest.fn().mockReturnValue([mockContext])
    });

    // Mock chromium.launch to return our mock browser
    (chromium.launch as jest.Mock).mockResolvedValue(mockBrowser);

    // Clean up any existing session file
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

    // Verify browser.newContext was called with storageState
    expect(mockBrowser.newContext).toHaveBeenCalledWith(
      expect.objectContaining({
        storageState: expect.objectContaining({
          cookies: expect.any(Array),
          origins: expect.any(Array)
        })
      })
    );

    await client.close();
  });

  test('should not load session when expired', async () => {
    // Write expired session to file
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.expiredSid, null, 2));

    const client = new BrowserMediumClient();
    await client.initialize();

    // Verify browser.newContext was called WITHOUT storageState
    // (because expired session should not be loaded)
    const calls = (mockBrowser.newContext as jest.Mock).mock.calls;
    expect(calls.length).toBeGreaterThan(0);
    const contextOptions = calls[0][0];

    // storageState should either be undefined or not contain the expired session
    if (contextOptions.storageState) {
      // If it has storageState, it should not be the expired one
      expect(contextOptions.storageState).not.toEqual(MOCK_SESSIONS.expiredSid);
    }

    await client.close();
  });
});
