import { test, expect } from '@playwright/test';
import { BrowserMediumClient } from '../src/browser-client';

test.describe('publishArticle() E2E - Draft Mode', () => {
  let client: BrowserMediumClient;

  test.beforeEach(async () => {
    client = new BrowserMediumClient();
  });

  test.afterEach(async () => {
    if (client) {
      await client.close();
    }
  });

  test('should save article as draft with title and content', async () => {
    await client.initialize();

    const testArticle = {
      title: `E2E Test Draft ${new Date().toISOString()}`,
      content: `This is an end-to-end test to verify publishArticle() works correctly.

This article contains multiple paragraphs to test content insertion.

The new selectors (Dec 2024) are:
- Title: [data-testid="editorTitleParagraph"]
- Content: [data-testid="editorParagraphText"]`,
      isDraft: true
    };

    const result = await client.publishArticle(testArticle);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  }, 120000); // 2 minute timeout for browser automation

  test('should handle multi-paragraph content correctly', async () => {
    await client.initialize();

    const paragraphs = [
      'First paragraph of content.',
      'Second paragraph with different content.',
      'Third paragraph to verify multiple paragraphs work.',
      'Fourth paragraph for good measure.'
    ];

    const testArticle = {
      title: `Multi-paragraph Test ${new Date().toISOString()}`,
      content: paragraphs.join('\n\n'),
      isDraft: true
    };

    const result = await client.publishArticle(testArticle);

    expect(result.success).toBe(true);
    expect(result.error).toBeUndefined();
  }, 120000);

  test('should complete within reasonable time', async () => {
    const startTime = Date.now();

    await client.initialize();

    const testArticle = {
      title: `Performance Test ${new Date().toISOString()}`,
      content: 'This is a quick test to verify performance is acceptable.',
      isDraft: true
    };

    const result = await client.publishArticle(testArticle);
    const duration = Date.now() - startTime;

    expect(result.success).toBe(true);
    expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
  }, 120000);
});
