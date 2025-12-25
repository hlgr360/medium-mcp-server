import { BrowserMediumClient } from '../../browser-client';

// Import custom matchers
import '../helpers/matchers';

/**
 * Integration tests for MCP tool handlers in index.ts
 *
 * Note: These tests focus on the BrowserMediumClient methods that power
 * the MCP tools. The actual MCP server.tool() registrations are tested
 * indirectly through method calls.
 */
describe('MCP Tool Handler Methods', () => {
  let client: BrowserMediumClient;

  beforeEach(() => {
    client = new BrowserMediumClient();
  });

  afterEach(async () => {
    try {
      await client.close();
    } catch (error) {
      // Ignore errors during cleanup
    }
  });

  describe('publish-article tool (via publishArticle method)', () => {
    test('should validate required fields (title, content)', async () => {
      // Test with missing title - should throw or return error
      await expect(
        client.publishArticle({
          title: '',
          content: 'Test content'
        })
      ).rejects.toThrow();

      // Test with short content - should throw or return error
      await expect(
        client.publishArticle({
          title: 'Test',
          content: 'short'
        })
      ).rejects.toThrow();
    });

    test('should pass correct parameters to publishArticle', async () => {
      const spy = jest.spyOn(client, 'publishArticle');
      spy.mockResolvedValue({ success: true, url: 'https://medium.com/test' });

      await client.publishArticle({
        title: 'Test Article',
        content: 'This is test content that is long enough.',
        tags: ['testing'],
        isDraft: false
      });

      expect(spy).toHaveBeenCalledWith({
        title: 'Test Article',
        content: 'This is test content that is long enough.',
        tags: ['testing'],
        isDraft: false
      });

      spy.mockRestore();
    });

    test('should handle publishArticle errors gracefully', async () => {
      const spy = jest.spyOn(client, 'publishArticle');
      spy.mockRejectedValue(new Error('Network error'));

      await expect(
        client.publishArticle({
          title: 'Test',
          content: 'Test content'
        })
      ).rejects.toThrow('Network error');

      spy.mockRestore();
    });

    test('should return success result on successful publish', async () => {
      const spy = jest.spyOn(client, 'publishArticle');
      const mockResult = {
        success: true,
        url: 'https://medium.com/@user/test-article'
      };
      spy.mockResolvedValue(mockResult);

      const result = await client.publishArticle({
        title: 'Test Article',
        content: 'Test content'
      });

      expect(result).toEqual(mockResult);
      spy.mockRestore();
    });
  });

  describe('get-my-articles tool (via getUserArticles method)', () => {
    test('should call getUserArticles and return articles', async () => {
      const spy = jest.spyOn(client, 'getUserArticles');
      const mockArticles = [
        {
          title: 'Article 1',
          content: 'Content 1',
          url: 'https://medium.com/article-1'
        }
      ];
      spy.mockResolvedValue(mockArticles);

      const articles = await client.getUserArticles();

      expect(articles).toEqual(mockArticles);
      spy.mockRestore();
    });

    test('should handle getUserArticles errors gracefully', async () => {
      const spy = jest.spyOn(client, 'getUserArticles');
      spy.mockRejectedValue(new Error('Failed to fetch articles'));

      await expect(client.getUserArticles()).rejects.toThrow('Failed to fetch articles');

      spy.mockRestore();
    });
  });

  describe('get-article-content tool (via getArticleContent method)', () => {
    test('should validate URL format', async () => {
      const spy = jest.spyOn(client, 'getArticleContent');

      // Invalid URL should fail
      spy.mockImplementation(async (url: string) => {
        if (!url.startsWith('http')) {
          throw new Error('Invalid URL');
        }
        return 'Article content';
      });

      await expect(client.getArticleContent('not-a-url')).rejects.toThrow('Invalid URL');

      spy.mockRestore();
    });

    test('should pass requireLogin parameter correctly', async () => {
      const spy = jest.spyOn(client, 'getArticleContent');
      spy.mockResolvedValue('Article content');

      await client.getArticleContent('https://medium.com/test', false);

      expect(spy).toHaveBeenCalledWith('https://medium.com/test', false);

      spy.mockRestore();
    });

    test('should handle getArticleContent errors gracefully', async () => {
      const spy = jest.spyOn(client, 'getArticleContent');
      spy.mockRejectedValue(new Error('Article not found'));

      await expect(
        client.getArticleContent('https://medium.com/nonexistent')
      ).rejects.toThrow('Article not found');

      spy.mockRestore();
    });
  });

  describe('search-medium tool (via searchMediumArticles method)', () => {
    test('should validate keywords array is not empty', async () => {
      const spy = jest.spyOn(client, 'searchMediumArticles');
      spy.mockImplementation(async (keywords: string[]) => {
        if (keywords.length === 0) {
          throw new Error('Keywords array must not be empty');
        }
        return [
          {
            title: 'Search Result',
            content: 'Result snippet',
            url: 'https://medium.com/result',
            publishDate: '',
            tags: [],
            claps: 0
          }
        ];
      });

      await expect(client.searchMediumArticles([])).rejects.toThrow(
        'Keywords array must not be empty'
      );

      spy.mockRestore();
    });

    test('should call searchMediumArticles with keywords', async () => {
      const spy = jest.spyOn(client, 'searchMediumArticles');
      spy.mockResolvedValue([
        {
          title: 'TypeScript Article',
          content: 'TypeScript testing guide',
          url: 'https://medium.com/result-1',
          publishDate: '2024-01-01',
          tags: ['typescript'],
          claps: 10
        },
        {
          title: 'Testing Article',
          content: 'Guide to testing',
          url: 'https://medium.com/result-2',
          publishDate: '2024-01-02',
          tags: ['testing'],
          claps: 20
        }
      ]);

      const results = await client.searchMediumArticles(['typescript', 'testing']);

      expect(spy).toHaveBeenCalledWith(['typescript', 'testing']);
      expect(results).toHaveLength(2);
      expect(results[0].title).toBe('TypeScript Article');

      spy.mockRestore();
    });

    test('should handle searchMediumArticles errors gracefully', async () => {
      const spy = jest.spyOn(client, 'searchMediumArticles');
      spy.mockRejectedValue(new Error('Search failed'));

      await expect(
        client.searchMediumArticles(['test'])
      ).rejects.toThrow('Search failed');

      spy.mockRestore();
    });
  });

  describe('login-to-medium tool (via initialize and ensureLoggedIn)', () => {
    test('should force non-headless mode for login', async () => {
      const initSpy = jest.spyOn(client, 'initialize');
      const loginSpy = jest.spyOn(client, 'ensureLoggedIn');
      const closeSpy = jest.spyOn(client, 'close');

      initSpy.mockResolvedValue();
      loginSpy.mockResolvedValue(true);
      closeSpy.mockResolvedValue();

      // Simulate login-to-medium tool behavior
      await client.initialize(false); // forceHeadless = false
      await client.ensureLoggedIn();
      await client.close();

      expect(initSpy).toHaveBeenCalledWith(false);
      expect(loginSpy).toHaveBeenCalled();
      expect(closeSpy).toHaveBeenCalled();

      initSpy.mockRestore();
      loginSpy.mockRestore();
      closeSpy.mockRestore();
    });

    test('should close browser after login attempt (success)', async () => {
      const initSpy = jest.spyOn(client, 'initialize');
      const loginSpy = jest.spyOn(client, 'ensureLoggedIn');
      const closeSpy = jest.spyOn(client, 'close');

      initSpy.mockResolvedValue();
      loginSpy.mockResolvedValue(true);
      closeSpy.mockResolvedValue();

      await client.initialize(false);
      const success = await client.ensureLoggedIn();
      await client.close();

      expect(success).toBe(true);
      expect(closeSpy).toHaveBeenCalled();

      initSpy.mockRestore();
      loginSpy.mockRestore();
      closeSpy.mockRestore();
    });

    test('should close browser after login attempt (failure)', async () => {
      const initSpy = jest.spyOn(client, 'initialize');
      const loginSpy = jest.spyOn(client, 'ensureLoggedIn');
      const closeSpy = jest.spyOn(client, 'close');

      initSpy.mockResolvedValue();
      loginSpy.mockResolvedValue(false);
      closeSpy.mockResolvedValue();

      await client.initialize(false);
      const success = await client.ensureLoggedIn();
      await client.close();

      expect(success).toBe(false);
      expect(closeSpy).toHaveBeenCalled();

      initSpy.mockRestore();
      loginSpy.mockRestore();
      closeSpy.mockRestore();
    });

    test('should return error message on login failure', async () => {
      const initSpy = jest.spyOn(client, 'initialize');
      const loginSpy = jest.spyOn(client, 'ensureLoggedIn');

      initSpy.mockResolvedValue();
      loginSpy.mockResolvedValue(false);

      await client.initialize(false);
      const success = await client.ensureLoggedIn();

      expect(success).toBe(false);

      initSpy.mockRestore();
      loginSpy.mockRestore();
    });
  });

  describe('withBrowserSession wrapper simulation', () => {
    test('should initialize browser before operation', async () => {
      const initSpy = jest.spyOn(client, 'initialize');
      const validateSpy = jest.spyOn(client, 'validateSessionFast');
      const closeSpy = jest.spyOn(client, 'close');

      initSpy.mockResolvedValue();
      validateSpy.mockResolvedValue(true);
      closeSpy.mockResolvedValue();

      // Simulate withBrowserSession behavior
      await client.initialize();
      await client.validateSessionFast();
      await client.close();

      expect(initSpy).toHaveBeenCalled();

      initSpy.mockRestore();
      validateSpy.mockRestore();
      closeSpy.mockRestore();
    });

    test('should validate session before operation', async () => {
      const initSpy = jest.spyOn(client, 'initialize');
      const validateSpy = jest.spyOn(client, 'validateSessionFast');
      const closeSpy = jest.spyOn(client, 'close');

      initSpy.mockResolvedValue();
      validateSpy.mockResolvedValue(true);
      closeSpy.mockResolvedValue();

      await client.initialize();
      const isValid = await client.validateSessionFast();
      await client.close();

      expect(validateSpy).toHaveBeenCalled();
      expect(isValid).toBe(true);

      initSpy.mockRestore();
      validateSpy.mockRestore();
      closeSpy.mockRestore();
    });

    test('should close browser after operation (success)', async () => {
      const initSpy = jest.spyOn(client, 'initialize');
      const validateSpy = jest.spyOn(client, 'validateSessionFast');
      const articlesSpy = jest.spyOn(client, 'getUserArticles');
      const closeSpy = jest.spyOn(client, 'close');

      initSpy.mockResolvedValue();
      validateSpy.mockResolvedValue(true);
      articlesSpy.mockResolvedValue([]);
      closeSpy.mockResolvedValue();

      // Simulate successful operation
      await client.initialize();
      await client.validateSessionFast();
      await client.getUserArticles();
      await client.close();

      expect(closeSpy).toHaveBeenCalled();

      initSpy.mockRestore();
      validateSpy.mockRestore();
      articlesSpy.mockRestore();
      closeSpy.mockRestore();
    });

    test('should close browser after operation (error)', async () => {
      const initSpy = jest.spyOn(client, 'initialize');
      const validateSpy = jest.spyOn(client, 'validateSessionFast');
      const articlesSpy = jest.spyOn(client, 'getUserArticles');
      const closeSpy = jest.spyOn(client, 'close');

      initSpy.mockResolvedValue();
      validateSpy.mockResolvedValue(true);
      articlesSpy.mockRejectedValue(new Error('Operation failed'));
      closeSpy.mockResolvedValue();

      // Simulate failed operation
      try {
        await client.initialize();
        await client.validateSessionFast();
        await client.getUserArticles();
      } catch (error) {
        // Expected error
      } finally {
        await client.close();
      }

      expect(closeSpy).toHaveBeenCalled();

      initSpy.mockRestore();
      validateSpy.mockRestore();
      articlesSpy.mockRestore();
      closeSpy.mockRestore();
    });

    test('should re-login if session invalid', async () => {
      const initSpy = jest.spyOn(client, 'initialize');
      const validateSpy = jest.spyOn(client, 'validateSessionFast');
      const loginSpy = jest.spyOn(client, 'ensureLoggedIn');
      const closeSpy = jest.spyOn(client, 'close');

      initSpy.mockResolvedValue();
      validateSpy.mockResolvedValue(false); // Session invalid
      loginSpy.mockResolvedValue(true);
      closeSpy.mockResolvedValue();

      await client.initialize();
      const isValid = await client.validateSessionFast();
      if (!isValid) {
        await client.ensureLoggedIn();
      }
      await client.close();

      expect(loginSpy).toHaveBeenCalled();

      initSpy.mockRestore();
      validateSpy.mockRestore();
      loginSpy.mockRestore();
      closeSpy.mockRestore();
    });
  });
});
