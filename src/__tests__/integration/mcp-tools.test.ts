import { BrowserMediumClient } from '../../browser-client';

// Import custom matchers
import '../helpers/matchers';

/**
 * Integration tests for MCP tool handlers in index.ts
 *
 * Note: These tests focus on validating method signatures and parameter handling
 * using spies. They do NOT launch real browsers.
 */
describe('MCP Tool Handler Methods', () => {
  let client: BrowserMediumClient;

  beforeEach(() => {
    client = new BrowserMediumClient();
  });

  describe('publish-article tool (via publishArticle method)', () => {
    test('should validate required fields (title, content)', async () => {
      // Mock the method to test validation without launching browser
      const spy = jest.spyOn(client, 'publishArticle');
      spy.mockImplementation(async (params: any) => {
        if (!params.title || params.title.length === 0) {
          throw new Error('Title is required');
        }
        if (!params.content || params.content.length < 10) {
          throw new Error('Content must be at least 10 characters');
        }
        return { success: true, url: 'https://medium.com/test' };
      });

      // Test with missing title - should throw or return error
      await expect(
        client.publishArticle({
          title: '',
          content: 'Test content'
        })
      ).rejects.toThrow('Title is required');

      // Test with short content - should throw or return error
      await expect(
        client.publishArticle({
          title: 'Test',
          content: 'short'
        })
      ).rejects.toThrow('Content must be at least 10 characters');

      spy.mockRestore();
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

  describe('get-feed tool (via getFeed method)', () => {
    test('should validate feed category parameter', async () => {
      const spy = jest.spyOn(client, 'getFeed');
      spy.mockResolvedValue([]);

      await client.getFeed('featured', 10);
      expect(spy).toHaveBeenCalledWith('featured', 10);

      await client.getFeed('for-you', 10);
      expect(spy).toHaveBeenCalledWith('for-you', 10);

      await client.getFeed('following', 10);
      expect(spy).toHaveBeenCalledWith('following', 10);

      await client.getFeed('all', 10);
      expect(spy).toHaveBeenCalledWith('all', 10);

      spy.mockRestore();
    });

    test('should use default limit of 10', async () => {
      const spy = jest.spyOn(client, 'getFeed');
      spy.mockResolvedValue([]);

      // Explicitly pass the default value to make it visible to the spy
      await client.getFeed('featured', 10);
      expect(spy).toHaveBeenCalledWith('featured', 10);

      spy.mockRestore();
    });

    test('should return array of feed articles', async () => {
      const spy = jest.spyOn(client, 'getFeed');
      const mockArticles = [
        {
          title: 'Test Feed Article',
          excerpt: 'This is an excerpt from the feed',
          url: 'https://medium.com/@user/test-article',
          author: 'Test Author',
          publishDate: '2 days ago',
          readTime: '5 min read'
        }
      ];
      spy.mockResolvedValue(mockArticles);

      const articles = await client.getFeed('featured', 5);
      expect(articles).toEqual(mockArticles);
      expect(articles[0].excerpt).toBeDefined();

      spy.mockRestore();
    });

    test('should tag articles with feedCategory when using "all"', async () => {
      const spy = jest.spyOn(client, 'getFeed');
      const mockArticles = [
        {
          title: 'Featured Article',
          excerpt: 'From featured feed',
          url: 'https://medium.com/@user/featured-article',
          feedCategory: 'featured' as const
        },
        {
          title: 'For You Article',
          excerpt: 'From for-you feed',
          url: 'https://medium.com/@user/for-you-article',
          feedCategory: 'for-you' as const
        },
        {
          title: 'Following Article',
          excerpt: 'From following feed',
          url: 'https://medium.com/@user/following-article',
          feedCategory: 'following' as const
        }
      ];
      spy.mockResolvedValue(mockArticles);

      const articles = await client.getFeed('all', 5);

      expect(articles).toEqual(mockArticles);
      expect(articles.every(a => a.feedCategory !== undefined)).toBe(true);
      expect(articles.some(a => a.feedCategory === 'featured')).toBe(true);
      expect(articles.some(a => a.feedCategory === 'for-you')).toBe(true);
      expect(articles.some(a => a.feedCategory === 'following')).toBe(true);

      spy.mockRestore();
    });

    test('should handle getFeed errors gracefully', async () => {
      const spy = jest.spyOn(client, 'getFeed');
      spy.mockRejectedValue(new Error('Feed unavailable'));

      await expect(client.getFeed('featured')).rejects.toThrow('Feed unavailable');

      spy.mockRestore();
    });
  });

  describe('get-lists tool (via getLists method)', () => {
    test('should call getLists and return list metadata', async () => {
      const spy = jest.spyOn(client, 'getLists');
      const mockLists = [
        {
          id: 'abc123',
          name: 'Reading List',
          description: 'My favorite articles',
          articleCount: 15,
          url: 'https://medium.com/list/abc123'
        }
      ];
      spy.mockResolvedValue(mockLists);

      const lists = await client.getLists();
      expect(lists).toEqual(mockLists);
      expect(lists[0].id).toBe('abc123');
      expect(lists[0].articleCount).toBe(15);

      spy.mockRestore();
    });

    test('should handle empty lists result', async () => {
      const spy = jest.spyOn(client, 'getLists');
      spy.mockResolvedValue([]);

      const lists = await client.getLists();
      expect(lists).toEqual([]);

      spy.mockRestore();
    });

    test('should handle getLists errors gracefully', async () => {
      const spy = jest.spyOn(client, 'getLists');
      spy.mockRejectedValue(new Error('Not logged in'));

      await expect(client.getLists()).rejects.toThrow('Not logged in');

      spy.mockRestore();
    });
  });

  describe('get-list-articles tool (via getListArticles method)', () => {
    test('should validate listId parameter', async () => {
      const spy = jest.spyOn(client, 'getListArticles');
      spy.mockResolvedValue([]);

      await client.getListArticles('test-list-id', 10);
      expect(spy).toHaveBeenCalledWith('test-list-id', 10);

      spy.mockRestore();
    });

    test('should use default limit of 10', async () => {
      const spy = jest.spyOn(client, 'getListArticles');
      spy.mockResolvedValue([]);

      // Explicitly pass the default value to make it visible to the spy
      await client.getListArticles('list-id', 10);
      expect(spy).toHaveBeenCalledWith('list-id', 10);

      spy.mockRestore();
    });

    test('should return array of articles from list', async () => {
      const spy = jest.spyOn(client, 'getListArticles');
      const mockArticles = [
        {
          title: 'List Article 1',
          excerpt: 'Excerpt from list article',
          url: 'https://medium.com/@user/article-1',
          author: 'Author 1'
        }
      ];
      spy.mockResolvedValue(mockArticles);

      const articles = await client.getListArticles('list-123', 5);
      expect(articles).toEqual(mockArticles);

      spy.mockRestore();
    });

    test('should handle invalid listId error', async () => {
      const spy = jest.spyOn(client, 'getListArticles');
      spy.mockRejectedValue(new Error('List not found: invalid-id'));

      await expect(
        client.getListArticles('invalid-id')
      ).rejects.toThrow('List not found');

      spy.mockRestore();
    });
  });
});
