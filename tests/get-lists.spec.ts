import { test, expect } from '@playwright/test';
import { BrowserMediumClient } from '../src/browser-client';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * E2E Test Suite for getLists()
 *
 * Tests real Medium reading list retrieval including:
 * - List metadata extraction
 * - Session requirement validation
 * - List structure validation
 * - Performance benchmarks
 */
test.describe('getLists() E2E', () => {
  const sessionPath = join(__dirname, '..', 'medium-session.json');
  let client: BrowserMediumClient;

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

  test('should fetch user reading lists', async () => {
    if (!existsSync(sessionPath)) {
      test.skip();
    }

    await client.initialize();

    const lists = await client.getLists();

    expect(Array.isArray(lists)).toBe(true);

    if (lists.length > 0) {
      lists.forEach(list => {
        // Required fields
        expect(list.id).toBeDefined();
        expect(typeof list.id).toBe('string');
        expect(list.id.length).toBeGreaterThan(0);

        expect(list.name).toBeDefined();
        expect(typeof list.name).toBe('string');

        // Optional fields
        if (list.url) {
          // URL format: https://medium.com/@username/list/list-id
          expect(list.url).toMatch(/medium\.com\/@[^\/]+\/list\//);
        }
        if (list.articleCount !== undefined) {
          expect(typeof list.articleCount).toBe('number');
          expect(list.articleCount).toBeGreaterThanOrEqual(0);
        }
      });

      console.log(`✅ Retrieved ${lists.length} list(s)`);
      lists.forEach(list => {
        console.log(`   - "${list.name}" (${list.articleCount || '?'} articles)`);
      });
    } else {
      console.log('ℹ️  No lists found (user may have no saved lists)');
    }
  }, 60000);

  test('should complete within reasonable time', async () => {
    if (!existsSync(sessionPath)) {
      test.skip();
    }

    await client.initialize();

    const startTime = Date.now();
    await client.getLists();
    const duration = Date.now() - startTime;

    expect(duration).toBeLessThan(20000); // 20 seconds
    console.log(`⏱️  Completed in ${(duration / 1000).toFixed(1)}s`);
  }, 60000);
});
