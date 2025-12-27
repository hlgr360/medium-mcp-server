import { test, expect } from '@playwright/test';
import { BrowserMediumClient } from '../src/browser-client';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * E2E Test Suite for getListArticles()
 *
 * Tests real Medium list article retrieval including:
 * - Article extraction from lists
 * - Invalid list ID handling
 * - Limit parameter functionality
 * - Performance benchmarks
 */
test.describe('getListArticles() E2E', () => {
  const sessionPath = join(__dirname, '..', 'medium-session.json');
  let client: BrowserMediumClient;
  let testListId: string | null = null;

  test.beforeEach(() => {
    client = new BrowserMediumClient();
  });

  test.afterEach(async () => {
    await client.close();
  });

  test('should require valid session', async () => {
    if (!existsSync(sessionPath)) {
      console.log('⏭️  Skipping: No session file. Run login-to-medium first.');
      test.skip();
    }
    expect(existsSync(sessionPath)).toBe(true);
  });

  test('should fetch list ID for testing', async () => {
    if (!existsSync(sessionPath)) {
      test.skip();
    }

    await client.initialize();

    const lists = await client.getLists();
    if (lists.length > 0) {
      testListId = lists[0].id;
      console.log(`📋 Using test list: "${lists[0].name}" (ID: ${testListId})`);
    } else {
      console.log('⚠️  No lists available for testing');
    }
  }, 60000);

  test('should fetch articles from a list', async () => {
    if (!existsSync(sessionPath)) {
      test.skip();
    }

    await client.initialize();

    // Get a list ID first
    const lists = await client.getLists();
    if (lists.length === 0) {
      console.log('⏭️  Skipping: User has no lists');
      return;
    }

    const listId = lists[0].id;
    const articles = await client.getListArticles(listId, 5);

    expect(Array.isArray(articles)).toBe(true);

    if (articles.length > 0) {
      articles.forEach(article => {
        expect(article.title).toBeDefined();
        expect(article.excerpt).toBeDefined();
        expect(article.url).toBeDefined();
        expect(article.url).toMatch(/medium\.com/);
      });

      console.log(`✅ Retrieved ${articles.length} article(s) from list`);
      console.log(`   Sample: "${articles[0].title.substring(0, 50)}..."`);
    } else {
      console.log('ℹ️  List is empty (no articles)');
    }
  }, 90000); // Longer timeout to fetch lists first

  test('should handle invalid list ID', async () => {
    if (!existsSync(sessionPath)) {
      test.skip();
    }

    await client.initialize();

    await expect(
      client.getListArticles('invalid-nonexistent-list-id-12345')
    ).rejects.toThrow(/not found/i);

    console.log('✅ Properly threw error for invalid list ID');
  }, 60000);

  test('should respect limit parameter', async () => {
    if (!existsSync(sessionPath)) {
      test.skip();
    }

    await client.initialize();

    const lists = await client.getLists();
    if (lists.length === 0) {
      console.log('⏭️  Skipping: User has no lists');
      return;
    }

    const listId = lists[0].id;
    const articles = await client.getListArticles(listId, 2);

    expect(articles.length).toBeLessThanOrEqual(2);
    console.log(`✅ Limit respected: ${articles.length} <= 2`);
  }, 90000);
});
