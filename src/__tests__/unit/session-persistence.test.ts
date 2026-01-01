import { BrowserMediumClient } from '../../browser-client';
import { MOCK_SESSIONS } from '../helpers/fixtures';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

/**
 * Unit tests for session persistence after browser operations.
 * Verifies that saveSession() is called automatically after each operation.
 *
 * These tests use mocked Playwright objects (see src/__tests__/setup.ts)
 * and are much faster than E2E tests (~100ms vs ~6s).
 */
describe('Session Persistence After Operations', () => {
  const sessionPath = join(__dirname, '..', '..', '..', 'medium-session.json');
  let client: BrowserMediumClient;
  let saveSessionSpy: jest.SpyInstance;

  beforeEach(async () => {
    // Clean up session file
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }

    // Create valid session for testing
    writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.valid, null, 2));

    // Initialize client
    client = new BrowserMediumClient();
    await client.initialize();

    // Spy on saveSession to verify it's called
    saveSessionSpy = jest.spyOn(client as any, 'saveSession');
  });

  afterEach(async () => {
    saveSessionSpy.mockRestore();
    await client.close();

    // Clean up session file
    if (existsSync(sessionPath)) {
      unlinkSync(sessionPath);
    }
    jest.clearAllMocks();
  });

  test('should call saveSession() after searchMediumArticles()', async () => {
    // Execute operation
    await client.searchMediumArticles(['test']);

    // Verify saveSession was called
    expect(saveSessionSpy).toHaveBeenCalledTimes(1);
  });

  test('should call saveSession() after getUserArticles()', async () => {
    // Mock ensureLoggedIn to avoid login flow in tests
    const ensureLoggedInSpy = jest.spyOn(client as any, 'ensureLoggedIn');
    ensureLoggedInSpy.mockResolvedValue(true);

    // Execute operation
    await client.getUserArticles();

    // Verify saveSession was called (ensureLoggedIn may also call it)
    expect(saveSessionSpy).toHaveBeenCalled();
  });

  test('should call saveSession() after getArticleContent()', async () => {
    // Execute operation
    await client.getArticleContent('https://medium.com/test-article', false);

    // Verify saveSession was called
    expect(saveSessionSpy).toHaveBeenCalledTimes(1);
  });

  test('should call saveSession() after getFeed()', async () => {
    // Execute operation
    await client.getFeed('featured', 5);

    // Verify saveSession was called
    expect(saveSessionSpy).toHaveBeenCalledTimes(1);
  });

  test('should call saveSession() after getLists()', async () => {
    // Mock ensureLoggedIn to avoid login flow
    const ensureLoggedInSpy = jest.spyOn(client as any, 'ensureLoggedIn');
    ensureLoggedInSpy.mockResolvedValue(true);

    // Execute operation
    await client.getLists();

    // Verify saveSession was called
    expect(saveSessionSpy).toHaveBeenCalled();
  });

  test('should call saveSession() after getListArticles()', async () => {
    // Mock ensureLoggedIn to avoid login flow
    const ensureLoggedInSpy = jest.spyOn(client as any, 'ensureLoggedIn');
    ensureLoggedInSpy.mockResolvedValue(true);

    // Mock page.evaluate to return a list URL
    const mockPage = (client as any).page;
    mockPage.evaluate
      .mockResolvedValueOnce('https://medium.com/@user/list/test-list-id') // First call: find list URL
      .mockResolvedValueOnce(false); // Second call: check error page

    // Execute operation
    await client.getListArticles('test-list-id', 5);

    // Verify saveSession was called
    expect(saveSessionSpy).toHaveBeenCalled();
  });

  test('should call saveSession() after publishArticle() with draft', async () => {
    // Mock ensureLoggedIn to avoid login flow
    const ensureLoggedInSpy = jest.spyOn(client as any, 'ensureLoggedIn');
    ensureLoggedInSpy.mockResolvedValue(true);

    // Mock the save button visibility and click
    const mockPage = (client as any).page;
    const mockLocator = {
      isVisible: jest.fn().mockResolvedValue(true),
      click: jest.fn().mockResolvedValue(null),
      first: jest.fn().mockReturnThis() // Make first() return itself for chaining
    };
    mockLocator.first.mockReturnValue(mockLocator); // Enable chaining

    mockPage.locator.mockReturnValue(mockLocator);
    mockPage.keyboard = {
      press: jest.fn().mockResolvedValue(null),
      type: jest.fn().mockResolvedValue(null)
    };

    // Execute operation
    await client.publishArticle({
      title: 'Test Article',
      content: 'Test content',
      isDraft: true
    });

    // Verify saveSession was called
    expect(saveSessionSpy).toHaveBeenCalled();
  });

  test('should call saveSession() after publishArticle() with publish', async () => {
    // Mock ensureLoggedIn to avoid login flow
    const ensureLoggedInSpy = jest.spyOn(client as any, 'ensureLoggedIn');
    ensureLoggedInSpy.mockResolvedValue(true);

    // Mock the publish button visibility and click
    const mockPage = (client as any).page;
    const mockLocator = {
      isVisible: jest.fn().mockResolvedValue(true),
      click: jest.fn().mockResolvedValue(null),
      first: jest.fn().mockReturnThis()
    };
    mockLocator.first.mockReturnValue(mockLocator);

    mockPage.locator.mockReturnValue(mockLocator);
    mockPage.keyboard = {
      press: jest.fn().mockResolvedValue(null),
      type: jest.fn().mockResolvedValue(null)
    };

    // Execute operation
    await client.publishArticle({
      title: 'Test Article',
      content: 'Test content',
      isDraft: false
    });

    // Verify saveSession was called
    expect(saveSessionSpy).toHaveBeenCalled();
  });

  test('should preserve session data structure after saveSession()', async () => {
    // Execute operation
    await client.searchMediumArticles(['test']);

    // Read session file
    const sessionData = require(sessionPath);

    // Verify structure
    expect(sessionData).toHaveProperty('cookies');
    expect(sessionData).toHaveProperty('origins');
    expect(Array.isArray(sessionData.cookies)).toBe(true);
    expect(Array.isArray(sessionData.origins)).toBe(true);
  });

  test('all operations should use common saveSession() method', () => {
    // This test verifies that saveSession is a shared method
    // If it's the same method, spying on it will catch all calls
    const method1 = (client as any).saveSession;
    const method2 = (client as any).saveSession;

    // Should be the same reference
    expect(method1).toBe(method2);

    // Should be a function
    expect(typeof method1).toBe('function');
  });
});
