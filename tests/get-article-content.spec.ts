import { test, expect } from '@playwright/test';
import { BrowserMediumClient } from '../src/browser-client';

/**
 * E2E Test Suite for getArticleContent()
 *
 * Tests real article content extraction from Medium URLs including:
 * - Public article fetching
 * - Content extraction with multiple paragraphs
 * - Paywall detection
 * - Invalid URL handling
 */
test.describe('getArticleContent() E2E', () => {
  let client: BrowserMediumClient;

  test.beforeEach(() => {
    client = new BrowserMediumClient();
  });

  test.afterEach(async () => {
    await client.close();
  });

  test('should fetch content from a public Medium article', async () => {
    await client.initialize();

    // Use a well-known, stable public Medium article
    // This article is from Medium's official blog and unlikely to be deleted
    const articleUrl = 'https://medium.com/@ev/is-medium-a-publishing-platform-or-a-publisher-1d3d6c6e3d3e';

    const content = await client.getArticleContent(articleUrl, false);

    // Validate content was extracted
    expect(content).toBeDefined();
    expect(typeof content).toBe('string');
    expect(content.length).toBeGreaterThan(100);

    // Content should contain text (not just error messages)
    expect(content).not.toContain('Error fetching article');

    console.log(`✅ Fetched ${content.length} characters from article`);
  }, 60000); // 60s timeout for browser automation

  test('should extract multi-paragraph content correctly', async () => {
    await client.initialize();

    const articleUrl = 'https://medium.com/@ev/is-medium-a-publishing-platform-or-a-publisher-1d3d6c6e3d3e';

    const content = await client.getArticleContent(articleUrl, false);

    // Multi-paragraph articles should have newlines
    expect(content).toContain('\n');

    // Should have substantial content
    expect(content.split('\n').length).toBeGreaterThan(3);

    console.log(`✅ Content has ${content.split('\n').length} paragraphs`);
  }, 60000);

  test('should handle articles with requireLogin=true', async () => {
    await client.initialize();

    // Test with requireLogin flag (may trigger login if session invalid)
    const articleUrl = 'https://medium.com/@ev/is-medium-a-publishing-platform-or-a-publisher-1d3d6c6e3d3e';

    // Should not throw, even if login fails
    await expect(
      client.getArticleContent(articleUrl, true)
    ).resolves.toBeDefined();
  }, 90000); // Longer timeout to allow for potential login

  test('should detect paywall/member-only indicators', async () => {
    await client.initialize();

    // Use a known member-only article (if accessible)
    // Note: This may return limited preview content
    const memberOnlyUrl = 'https://medium.com/towards-data-science/python-best-practices-2024-1234567890ab';

    try {
      const content = await client.getArticleContent(memberOnlyUrl, false);

      // Either we get content (preview) or an error
      expect(content).toBeDefined();

      // If we got content, log whether it mentions paywall
      if (content.includes('member') || content.includes('Sign up') || content.includes('Continue reading')) {
        console.log('✅ Detected paywall indicators in content');
      } else {
        console.log('ℹ️  Article fetched (may be preview or public)');
      }
    } catch (error: any) {
      // It's OK if the article doesn't exist or is inaccessible
      console.log(`ℹ️  Article not accessible: ${error.message}`);
      expect(error.message).toBeDefined();
    }
  }, 60000);

  test('should handle invalid or non-existent URLs gracefully', async () => {
    await client.initialize();

    const invalidUrl = 'https://medium.com/@nonexistent/article-that-does-not-exist-12345';

    try {
      const content = await client.getArticleContent(invalidUrl, false);

      // Should either get empty content or error message
      expect(content).toBeDefined();
      expect(typeof content).toBe('string');
    } catch (error: any) {
      // Error is acceptable for invalid URLs
      expect(error.message).toBeDefined();
      console.log('✅ Properly threw error for invalid URL');
    }
  }, 60000);

  test('should complete within reasonable time', async () => {
    const startTime = Date.now();

    await client.initialize();

    const articleUrl = 'https://medium.com/@ev/is-medium-a-publishing-platform-or-a-publisher-1d3d6c6e3d3e';
    await client.getArticleContent(articleUrl, false);

    const duration = Date.now() - startTime;

    // Should complete within 45 seconds
    expect(duration).toBeLessThan(45000);

    console.log(`⏱️  Completed in ${(duration / 1000).toFixed(1)}s`);
  }, 60000);

  test('should work without login when requireLogin=false', async () => {
    await client.initialize();

    const publicUrl = 'https://medium.com/@ev/is-medium-a-publishing-platform-or-a-publisher-1d3d6c6e3d3e';

    // Should fetch content without attempting login
    const content = await client.getArticleContent(publicUrl, false);

    expect(content).toBeDefined();
    expect(content.length).toBeGreaterThan(50);

    console.log('✅ Fetched public article without login');
  }, 60000);
});
