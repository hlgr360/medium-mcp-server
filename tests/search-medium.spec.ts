import { test, expect } from '@playwright/test';
import { BrowserMediumClient } from '../src/browser-client';

/**
 * E2E Test Suite for searchMediumArticles()
 *
 * Tests real Medium search functionality including:
 * - Keyword-based search
 * - Result parsing and structure
 * - Multiple keyword handling
 * - Empty result scenarios
 */
test.describe('searchMediumArticles() E2E', () => {
  let client: BrowserMediumClient;

  test.beforeEach(() => {
    client = new BrowserMediumClient();
  });

  test.afterEach(async () => {
    await client.close();
  });

  test('should search Medium and return results', async () => {
    await client.initialize();

    // Search for a popular topic that should have many results
    const results = await client.searchMediumArticles(['javascript', 'programming']);

    // Should return an array
    expect(Array.isArray(results)).toBe(true);

    // Should have at least some results for popular topics
    expect(results.length).toBeGreaterThan(0);

    console.log(`✅ Found ${results.length} search results`);
  }, 60000); // 60s timeout for browser automation

  test('should return articles with correct structure', async () => {
    await client.initialize();

    const results = await client.searchMediumArticles(['typescript']);

    expect(results.length).toBeGreaterThan(0);

    // Validate structure of first result
    const firstResult = results[0];

    // Required fields
    expect(firstResult).toHaveProperty('title');
    expect(firstResult).toHaveProperty('url');
    expect(firstResult).toHaveProperty('content');

    // Title should be non-empty
    expect(typeof firstResult.title).toBe('string');
    expect(firstResult.title.length).toBeGreaterThan(0);

    // URL should be a valid Medium URL
    expect(typeof firstResult.url).toBe('string');
    expect(
      firstResult.url.includes('medium.com') ||
      firstResult.url.includes('@')
    ).toBe(true);

    // Content should be a string (preview/snippet)
    expect(typeof firstResult.content).toBe('string');
  }, 60000);

  test('should handle multiple keywords', async () => {
    await client.initialize();

    const results = await client.searchMediumArticles([
      'react',
      'hooks',
      'tutorial'
    ]);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    console.log(`✅ Multi-keyword search returned ${results.length} results`);
  }, 60000);

  test('should handle single keyword search', async () => {
    await client.initialize();

    const results = await client.searchMediumArticles(['python']);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBeGreaterThan(0);

    console.log(`✅ Single keyword search returned ${results.length} results`);
  }, 60000);

  test('should handle obscure search terms gracefully', async () => {
    await client.initialize();

    // Search for very specific/obscure term that may have few results
    const results = await client.searchMediumArticles([
      'xyzabc123nonexistent9999'
    ]);

    // Should return empty array for no results, not throw error
    expect(Array.isArray(results)).toBe(true);

    if (results.length === 0) {
      console.log('✅ Properly returned empty array for obscure search');
    } else {
      console.log(`ℹ️  Found ${results.length} results (unexpected but valid)`);
    }
  }, 60000);

  test('should extract article metadata correctly', async () => {
    await client.initialize();

    const results = await client.searchMediumArticles(['nodejs']);

    expect(results.length).toBeGreaterThan(0);

    // Check optional metadata fields (may or may not be present)
    results.slice(0, 3).forEach((article) => {
      // Optional fields
      if (article.publishDate) {
        expect(typeof article.publishDate).toBe('string');
      }

      if (article.tags && article.tags.length > 0) {
        expect(Array.isArray(article.tags)).toBe(true);
      }

      if (article.claps !== undefined) {
        expect(typeof article.claps).toBe('number');
      }
    });
  }, 60000);

  test('should return unique article URLs', async () => {
    await client.initialize();

    const results = await client.searchMediumArticles(['web', 'development']);

    expect(results.length).toBeGreaterThan(0);

    // Extract URLs
    const urls = results.map(r => r.url);

    // Check for duplicates
    const uniqueUrls = new Set(urls);

    // Most URLs should be unique (allowing for small number of duplicates)
    const duplicateCount = urls.length - uniqueUrls.size;
    expect(duplicateCount).toBeLessThan(urls.length * 0.2); // Less than 20% duplicates

    console.log(`✅ ${uniqueUrls.size} unique URLs out of ${urls.length} results`);
  }, 60000);

  test('should complete within reasonable time', async () => {
    const startTime = Date.now();

    await client.initialize();
    await client.searchMediumArticles(['testing']);

    const duration = Date.now() - startTime;

    // Should complete within 45 seconds
    expect(duration).toBeLessThan(45000);

    console.log(`⏱️  Search completed in ${(duration / 1000).toFixed(1)}s`);
  }, 60000);
});
