import { test, expect } from '@playwright/test';
import { BrowserMediumClient, FeedCategory } from '../src/browser-client';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * E2E Test Suite for getFeed()
 *
 * Tests real Medium feed retrieval including:
 * - Featured, For You, and Following feeds
 * - Article structure validation
 * - Limit parameter functionality
 * - Performance benchmarks
 */
test.describe('getFeed() E2E', () => {
  const sessionPath = join(__dirname, '..', 'medium-session.json');
  let client: BrowserMediumClient;

  test.beforeEach(() => {
    client = new BrowserMediumClient();
  });

  test.afterEach(async () => {
    await client.close();
  });

  const categories: FeedCategory[] = ['featured', 'for-you', 'following'];

  categories.forEach(category => {
    test(`should fetch ${category} feed articles`, async () => {
      // Following feed requires login
      if (category === 'following' && !existsSync(sessionPath)) {
        console.log('⏭️  Skipping: Following feed requires session. Run login-to-medium first.');
        test.skip();
      }

      await client.initialize();

      const articles = await client.getFeed(category, 5);

      expect(Array.isArray(articles)).toBe(true);

      if (articles.length > 0) {
        articles.forEach(article => {
          // Required fields
          expect(article.title).toBeDefined();
          expect(typeof article.title).toBe('string');
          expect(article.title.length).toBeGreaterThan(0);

          expect(article.excerpt).toBeDefined();
          expect(typeof article.excerpt).toBe('string');

          expect(article.url).toBeDefined();
          expect(article.url).toMatch(/https:\/\/medium\.com/);

          // Optional fields (may or may not be present)
          if (article.author) {
            expect(typeof article.author).toBe('string');
          }
          if (article.publishDate) {
            expect(typeof article.publishDate).toBe('string');
          }
          if (article.readTime) {
            expect(typeof article.readTime).toBe('string');
          }
        });

        console.log(`✅ ${category}: Retrieved ${articles.length} article(s)`);
        console.log(`   Sample: "${articles[0].title.substring(0, 50)}..."`);
      } else {
        console.log(`ℹ️  ${category}: No articles found (this may be normal)`);
      }
    }, 60000); // 60s timeout
  });

  test('should respect limit parameter', async () => {
    await client.initialize();

    const articles = await client.getFeed('featured', 3);

    expect(articles.length).toBeLessThanOrEqual(3);
    console.log(`✅ Limit respected: ${articles.length} <= 3`);
  }, 60000);

  test('should complete within reasonable time', async () => {
    await client.initialize();

    const startTime = Date.now();
    await client.getFeed('featured', 5);
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(30000); // 30 seconds
    console.log(`⏱️  Completed in ${(duration / 1000).toFixed(1)}s`);
  }, 60000);
});
