import { test, expect } from '@playwright/test';
import { BrowserMediumClient } from '../src/browser-client';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * E2E Test Suite for getUserArticles()
 *
 * Tests the complete article retrieval flow including:
 * - Tab detection and parsing
 * - Multi-tab scraping (drafts, published, unlisted, etc.)
 * - Article extraction with dual link format support
 * - Status tagging
 * - Date extraction
 */
test.describe('getUserArticles() E2E', () => {
  const sessionPath = join(__dirname, '..', 'medium-session.json');
  let client: BrowserMediumClient;

  test.beforeEach(() => {
    client = new BrowserMediumClient();
  });

  test.afterEach(async () => {
    await client.close();
  });

  test('should require valid session file', async () => {
    if (!existsSync(sessionPath)) {
      test.skip();
    }
    // If session exists, test should be able to run
    expect(existsSync(sessionPath)).toBe(true);
  });

  test('should fetch articles from all tabs', async () => {
    // Skip if no session (requires manual login first)
    if (!existsSync(sessionPath)) {
      console.log('⏭️  Skipping: No session file. Run login-to-medium first.');
      test.skip();
    }

    // Initialize browser
    await client.initialize();

    // Fetch all articles
    const articles = await client.getUserArticles();

    // Basic validation
    expect(Array.isArray(articles)).toBe(true);

    // If we have articles, validate their structure
    if (articles.length > 0) {
      articles.forEach(article => {
        // Required fields
        expect(article.title).toBeDefined();
        expect(typeof article.title).toBe('string');
        expect(article.title.length).toBeGreaterThan(0);

        // URL should be present
        expect(article.url).toBeDefined();
        expect(typeof article.url).toBe('string');

        // URL should be a valid Medium URL
        expect(
          article.url?.includes('medium.com') ||
          article.url?.includes('@')
        ).toBe(true);

        // Status should be one of the valid values
        if (article.status) {
          expect(['draft', 'published', 'unlisted', 'scheduled', 'submission', 'unknown'])
            .toContain(article.status);
        }

        // Content should be empty string (not fetched by getUserArticles)
        expect(article.content).toBe('');
      });

      console.log(`✅ Validated ${articles.length} article(s)`);

      // Log status distribution
      const byStatus: { [key: string]: number } = {};
      articles.forEach(a => {
        const status = a.status || 'unknown';
        byStatus[status] = (byStatus[status] || 0) + 1;
      });

      console.log('📊 Status distribution:', byStatus);
    } else {
      console.log('ℹ️  No articles found (this is OK if you have no articles)');
    }
  });

  test('should handle articles with different statuses', async () => {
    if (!existsSync(sessionPath)) {
      test.skip();
    }

    await client.initialize();
    const articles = await client.getUserArticles();

    // Group by status
    const byStatus: { [key: string]: typeof articles } = {};
    articles.forEach(article => {
      const status = article.status || 'unknown';
      if (!byStatus[status]) byStatus[status] = [];
      byStatus[status].push(article);
    });

    // Validate each status group
    Object.entries(byStatus).forEach(([status, statusArticles]) => {
      expect(statusArticles.length).toBeGreaterThan(0);

      // All articles in group should have same status
      statusArticles.forEach(article => {
        expect(article.status).toBe(status);
      });

      console.log(`  ${status}: ${statusArticles.length} article(s)`);
    });
  });

  test('should extract valid URLs for both draft and published articles', async () => {
    if (!existsSync(sessionPath)) {
      test.skip();
    }

    await client.initialize();
    const articles = await client.getUserArticles();

    if (articles.length === 0) {
      console.log('ℹ️  No articles to test URLs');
      return;
    }

    articles.forEach(article => {
      const url = article.url || '';

      // URL should be a valid Medium URL format
      const isDraftFormat = /^https:\/\/medium\.com\/p\/[a-f0-9]+$/.test(url);
      const isPublishedFormat = /^https:\/\/medium\.com\/@[^/]+\//.test(url);
      const isSourceParam = url.includes('?source=');

      expect(isDraftFormat || isPublishedFormat || isSourceParam).toBe(true);

      console.log(`  ${article.status}: ${article.title.substring(0, 40)} → ${url.substring(0, 60)}`);
    });
  });

  test('should complete within reasonable time', async () => {
    if (!existsSync(sessionPath)) {
      test.skip();
    }

    const startTime = Date.now();

    await client.initialize();
    await client.getUserArticles();

    const duration = Date.now() - startTime;

    // Should complete within 60 seconds (allowing for multiple tab clicks)
    expect(duration).toBeLessThan(60000);

    console.log(`⏱️  Completed in ${(duration / 1000).toFixed(1)}s`);
  });
});
