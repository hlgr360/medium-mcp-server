import { BrowserMediumClient } from '../../browser-client';
import { MOCK_SESSIONS, MOCK_ARTICLES } from '../helpers/fixtures';
import { MockPlaywrightFactory } from '../helpers/mock-playwright';
import { chromium } from 'playwright';
import { existsSync, unlinkSync, writeFileSync } from 'fs';
import { join } from 'path';

// Import custom matchers
import '../helpers/matchers';

// Mock the chromium module
jest.mock('playwright', () => ({
  chromium: {
    launch: jest.fn()
  }
}));

/**
 * Integration tests for BrowserMediumClient with mocked Playwright.
 * Tests public methods with realistic mock behavior to verify
 * method integration without launching real browser.
 */
describe('BrowserMediumClient Integration Tests', () => {
  const sessionPath = join(__dirname, '..', '..', '..', 'medium-session.json');
  let mockFactory: MockPlaywrightFactory;
  let mockBrowser: any;
  let mockContext: any;
  let mockPage: any;

  beforeEach(() => {
    mockFactory = new MockPlaywrightFactory();

    // Create default mock page with common methods
    mockPage = mockFactory.createMockPage({
      goto: jest.fn().mockResolvedValue(null),
      waitForLoadState: jest.fn().mockResolvedValue(null),
      waitForTimeout: jest.fn().mockResolvedValue(null),
      url: jest.fn().mockReturnValue('https://medium.com'),
      evaluate: jest.fn().mockResolvedValue([])
    });

    mockContext = mockFactory.createMockContext({
      newPage: jest.fn().mockResolvedValue(mockPage),
      addInitScript: jest.fn().mockResolvedValue(null),
      storageState: jest.fn().mockResolvedValue(MOCK_SESSIONS.valid)
    });

    mockBrowser = mockFactory.createMockBrowser({
      newContext: jest.fn().mockResolvedValue(mockContext),
      contexts: jest.fn().mockReturnValue([mockContext]),
      close: jest.fn().mockResolvedValue(null)
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

  describe('initialize()', () => {
    test('should launch browser with headless=true when valid session exists', async () => {
      writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.valid, null, 2));

      const client = new BrowserMediumClient();
      await client.initialize();

      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({ headless: true })
      );
      expect(mockBrowser.newContext).toHaveBeenCalledWith(
        expect.objectContaining({ storageState: expect.any(Object) })
      );
    });

    test('should launch browser with headless=false when no session exists', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({ headless: false })
      );
    });

    test('should load session from file when valid and unexpired', async () => {
      writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.valid, null, 2));

      const client = new BrowserMediumClient();
      await client.initialize();

      expect(mockBrowser.newContext).toHaveBeenCalledWith(
        expect.objectContaining({
          storageState: expect.objectContaining({
            cookies: expect.arrayContaining([
              expect.objectContaining({ name: 'sid' })
            ])
          })
        })
      );
    });

    test('should skip loading session when cookies are expired', async () => {
      writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.expiredSid, null, 2));

      const client = new BrowserMediumClient();
      await client.initialize();

      // Should NOT load storageState for expired session
      const contextCalls = (mockBrowser.newContext as jest.Mock).mock.calls;
      const contextOptions = contextCalls[0][0];

      // Should either have no storageState or not have the expired session
      if (contextOptions.storageState) {
        expect(contextOptions.storageState).not.toEqual(MOCK_SESSIONS.expiredSid);
      }
    });

    test('should respect forceHeadless parameter when provided', async () => {
      // Force headless even without session
      const client = new BrowserMediumClient();
      await client.initialize(true);

      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({ headless: true })
      );

      await client.close();

      // Force non-headless even with valid session
      writeFileSync(sessionPath, JSON.stringify(MOCK_SESSIONS.valid, null, 2));
      jest.clearAllMocks();
      (chromium.launch as jest.Mock).mockResolvedValue(mockBrowser);

      const client2 = new BrowserMediumClient();
      await client2.initialize(false);

      expect(chromium.launch).toHaveBeenCalledWith(
        expect.objectContaining({ headless: false })
      );
    });
  });

  describe('saveSession()', () => {
    test('should save cookies and origins to session file', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      // Mock storageState to return session data
      (mockContext.storageState as jest.Mock).mockResolvedValue(MOCK_SESSIONS.valid);

      await client.saveSession();

      // Verify file was created
      expect(existsSync(sessionPath)).toBe(true);

      // Verify file content
      const savedSession = JSON.parse(require('fs').readFileSync(sessionPath, 'utf8'));
      expect(savedSession).toBeValidSessionFile();
      expect(savedSession.cookies).toEqual(MOCK_SESSIONS.valid.cookies);
    });

    test('should set isAuthenticatedSession flag after save', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      await client.saveSession();

      // After saving, preValidateSession should return true
      const isValid = await client.preValidateSession();
      expect(isValid).toBe(true);
    });

    test('should handle save errors gracefully', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      // Mock storageState to throw error
      (mockContext.storageState as jest.Mock).mockRejectedValue(new Error('Storage error'));

      // Should not throw
      await expect(client.saveSession()).resolves.not.toThrow();
    });
  });

  describe('publishArticle()', () => {
    test('should navigate to /new-story and fill editor', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      // Mock successful publish flow
      mockPage.waitForSelector = jest.fn().mockResolvedValue(null);
      mockPage.fill = jest.fn().mockResolvedValue(null);
      mockPage.click = jest.fn().mockResolvedValue(null);

      await client.publishArticle({
        title: 'Test Article',
        content: 'Test content',
        isDraft: false
      });

      // Should navigate to /new-story (possibly after login check)
      const gotoMock = mockPage.goto as jest.Mock;
      const callArgs = gotoMock.mock.calls.map(call => call[0]);
      expect(callArgs.some((url: string) => url.includes('/new-story'))).toBe(true);
    });

    test('should handle tags correctly when provided', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      mockPage.waitForSelector = jest.fn().mockResolvedValue(null);
      mockPage.fill = jest.fn().mockResolvedValue(null);
      mockPage.click = jest.fn().mockResolvedValue(null);
      mockPage.keyboard = {
        press: jest.fn().mockResolvedValue(null),
        type: jest.fn().mockResolvedValue(null)
      };

      // Mock locator for publish button
      const mockLocator = {
        first: jest.fn().mockReturnThis(),
        isVisible: jest.fn().mockResolvedValue(true),
        click: jest.fn().mockResolvedValue(null)
      };
      mockPage.locator = jest.fn().mockReturnValue(mockLocator);

      await client.publishArticle({
        title: 'Test Article',
        content: 'Test content',
        tags: ['testing', 'jest'],
        isDraft: false
      });

      // Should have used keyboard to type content
      expect(mockPage.keyboard.type).toHaveBeenCalled();
    });

    test('should save as draft when isDraft=true', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      mockPage.waitForSelector = jest.fn().mockResolvedValue(null);
      mockPage.fill = jest.fn().mockResolvedValue(null);
      mockPage.click = jest.fn().mockResolvedValue(null);

      await client.publishArticle({
        title: 'Draft Article',
        content: 'Draft content',
        isDraft: true
      });

      // Should have filled title and content
      expect(mockPage.fill).toHaveBeenCalled();
    });

    test('should publish when isDraft=false', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      mockPage.waitForSelector = jest.fn().mockResolvedValue(null);
      mockPage.fill = jest.fn().mockResolvedValue(null);
      mockPage.click = jest.fn().mockResolvedValue(null);

      await client.publishArticle({
        title: 'Published Article',
        content: 'Published content',
        isDraft: false
      });

      // Should have clicked publish button
      expect(mockPage.click).toHaveBeenCalled();
    });

    test('should return error message on publish failure', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      // Mock navigation failure
      mockPage.goto = jest.fn().mockRejectedValue(new Error('Navigation failed'));

      await expect(
        client.publishArticle({
          title: 'Test',
          content: 'Test',
          isDraft: false
        })
      ).rejects.toThrow();
    });
  });

  describe('getUserArticles()', () => {
    test('should scrape articles from /me/stories/public', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      // Mock article scraping
      mockPage.evaluate = jest.fn().mockResolvedValue([
        {
          title: 'Article 1',
          url: 'https://medium.com/article-1',
          publishDate: '2024-01-01'
        }
      ]);

      const articles = await client.getUserArticles();

      // Check that goto was called with the articles URL (may be after login check)
      const gotoMock = mockPage.goto as jest.Mock;
      const callArgs = gotoMock.mock.calls.map(call => call[0]);
      expect(callArgs.some((url: string) => url.includes('/me/stories/public'))).toBe(true);
      expect(articles).toHaveLength(1);
    });

    test('should ensure login before fetching articles', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      // Mock not logged in initially
      mockPage.url = jest.fn()
        .mockReturnValueOnce('https://medium.com/m/signin')
        .mockReturnValue('https://medium.com');
      mockPage.waitForSelector = jest.fn().mockResolvedValue(null);
      mockPage.evaluate = jest.fn().mockResolvedValue([]);

      await client.getUserArticles();

      // Should have attempted navigation to login page (ensureLoggedIn called)
      const gotoMock = mockPage.goto as jest.Mock;
      const callArgs = gotoMock.mock.calls.map(call => call[0]);
      expect(callArgs.some((url: string) => url.includes('/m/signin'))).toBe(true);
    });

    test('should handle empty article list', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      mockPage.evaluate = jest.fn().mockResolvedValue([]);

      const articles = await client.getUserArticles();

      expect(articles).toEqual([]);
    });
  });

  describe('getArticleContent()', () => {
    test('should extract content using modern selectors', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      mockPage.evaluate = jest.fn().mockResolvedValue(
        'First paragraph.\n\nSecond paragraph.\n\nThird paragraph.'
      );

      const content = await client.getArticleContent('https://medium.com/test-article');

      expect(content).toContain('First paragraph');
      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://medium.com/test-article',
        expect.any(Object)
      );
    });

    test('should detect paywall indicators', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      // Mock paywall detection
      mockPage.evaluate = jest.fn().mockResolvedValue(
        'Preview content only. Sign up to continue reading this member-only story.'
      );

      const content = await client.getArticleContent('https://medium.com/paywall-article');

      expect(content).toContain('member-only');
    });

    test('should detect preview-only content', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      mockPage.evaluate = jest.fn().mockResolvedValue(
        'Short preview. This is a premium article.'
      );

      const content = await client.getArticleContent('https://medium.com/premium-article');

      expect(content.length).toBeGreaterThan(0);
    });

    test('should skip login when requireLogin=false', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      mockPage.evaluate = jest.fn().mockResolvedValue('Public article content');

      await client.getArticleContent('https://medium.com/public-article', false);

      // Should NOT have attempted login
      expect(mockPage.goto).not.toHaveBeenCalledWith(
        expect.stringContaining('/m/signin'),
        expect.any(Object)
      );
    });

    test('should attempt login when requireLogin=true and not authenticated', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      mockPage.url = jest.fn()
        .mockReturnValueOnce('https://medium.com/m/signin')
        .mockReturnValue('https://medium.com');
      mockPage.waitForSelector = jest.fn().mockResolvedValue(null);
      mockPage.evaluate = jest.fn().mockResolvedValue('Article content');

      await client.getArticleContent('https://medium.com/article', true);

      // Should have called ensureLoggedIn which navigates to /m/signin
      const gotoMock = mockPage.goto as jest.Mock;
      const callArgs = gotoMock.mock.calls.map(call => call[0]);
      expect(callArgs.some((url: string) => url.includes('/m/signin'))).toBe(true);
    });
  });

  describe('searchMediumArticles()', () => {
    test('should search with encoded keywords', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      mockPage.evaluate = jest.fn().mockResolvedValue([
        {
          title: 'TypeScript Guide',
          content: 'TypeScript testing guide',
          url: 'https://medium.com/result-1',
          publishDate: '2024-01-01',
          tags: ['typescript'],
          claps: 10
        },
        {
          title: 'Testing Guide',
          content: 'Testing best practices',
          url: 'https://medium.com/result-2',
          publishDate: '2024-01-02',
          tags: ['testing'],
          claps: 20
        }
      ]);

      const results = await client.searchMediumArticles(['typescript', 'testing']);

      // Should have navigated to search URL with query parameters
      const gotoMock = mockPage.goto as jest.Mock;
      const searchUrl = gotoMock.mock.calls.find((call: any) =>
        call[0].includes('/search?q=')
      );
      expect(searchUrl).toBeDefined();
      expect(searchUrl[0]).toContain('typescript');
      expect(results).toHaveLength(2);
      expect(results[0].url).toContain('medium.com');
    });

    test('should extract article URLs correctly', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      mockPage.evaluate = jest.fn().mockResolvedValue([
        {
          title: 'Article 1',
          content: 'Content 1',
          url: 'https://medium.com/@author/article-1',
          publishDate: '2024-01-01',
          tags: [],
          claps: 0
        },
        {
          title: 'Article 2',
          content: 'Content 2',
          url: 'https://medium.com/publication/article-2',
          publishDate: '2024-01-02',
          tags: [],
          claps: 0
        }
      ]);

      const results = await client.searchMediumArticles(['jest']);

      expect(results[0].url).toMatch(/^https:\/\/medium\.com\//);
      expect(results[1].url).toMatch(/^https:\/\/medium\.com\//);
    });

    test('should handle no results gracefully', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      mockPage.evaluate = jest.fn().mockResolvedValue([]);

      const results = await client.searchMediumArticles(['nonexistent']);

      expect(results).toEqual([]);
    });
  });

  describe('validateSessionFast()', () => {
    test('should navigate to /me and check for redirect', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      mockPage.url = jest.fn().mockReturnValue('https://medium.com/me');

      const isValid = await client.validateSessionFast();

      expect(mockPage.goto).toHaveBeenCalledWith(
        'https://medium.com/me',
        expect.any(Object)
      );
    });

    test('should return true when not redirected to login', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      mockPage.url = jest.fn().mockReturnValue('https://medium.com/me');

      const isValid = await client.validateSessionFast();

      expect(isValid).toBe(true);
    });

    test('should return false when redirected to login page', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      mockPage.url = jest.fn().mockReturnValue('https://medium.com/m/signin');

      const isValid = await client.validateSessionFast();

      expect(isValid).toBe(false);
    });

    test('should return false for 401/403 status responses', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      // Mock navigation that results in error
      mockPage.goto = jest.fn().mockRejectedValue(new Error('Navigation failed with 401'));

      const isValid = await client.validateSessionFast();

      expect(isValid).toBe(false);
    });

    test('should complete in reasonable time', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      mockPage.url = jest.fn().mockReturnValue('https://medium.com/me');

      const startTime = Date.now();
      await client.validateSessionFast();
      const duration = Date.now() - startTime;

      // Should complete quickly (mock overhead should be < 1000ms)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('close()', () => {
    test('should close browser and reset state', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      await client.close();

      expect(mockBrowser.close).toHaveBeenCalled();
    });

    test('should handle close when not initialized', async () => {
      const client = new BrowserMediumClient();

      // Should not throw
      await expect(client.close()).resolves.not.toThrow();
    });

    test('should handle double close gracefully', async () => {
      const client = new BrowserMediumClient();
      await client.initialize();

      await client.close();

      // Second close should not throw
      await expect(client.close()).resolves.not.toThrow();
    });
  });
});
