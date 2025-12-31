/**
 * Integration Tests for ArticleParser
 *
 * Tests article parsing logic using HTML fixtures instead of live browser automation.
 * This provides fast, deterministic tests that don't require a Medium account.
 */

import { ArticleParser } from '../parsers/article-parser';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ensureFixtures } from '../helpers/ensure-fixtures';

const fixturesDir = join(__dirname, '..', 'fixtures');

// Helper to load fixture
function loadFixture(filename: string): string {
  const path = join(fixturesDir, filename);
  if (!existsSync(path)) {
    throw new Error(`Fixture not found: ${filename}. Run: npx ts-node scripts/utils/capture-fixtures.ts`);
  }
  return readFileSync(path, 'utf-8');
}

describe('ArticleParser', () => {
  // Auto-capture fixtures if they don't exist
  beforeAll(async () => {
    await ensureFixtures();
  });
  describe('parseArticleTabs()', () => {
    it('should parse tab names and counts from user articles page', () => {
      const html = loadFixture('user-articles-page.html');
      const tabs = ArticleParser.parseArticleTabs(html);

      expect(Array.isArray(tabs)).toBe(true);

      // Should find at least some tabs (or empty if user has no articles)
      tabs.forEach(tab => {
        expect(tab.name).toBeDefined();
        expect(typeof tab.name).toBe('string');
        expect(typeof tab.count).toBe('number');
        expect(tab.count).toBeGreaterThanOrEqual(0);
        expect(tab.text).toBeDefined();

        // Tab name should be valid
        expect(['drafts', 'published', 'unlisted', 'scheduled', 'submissions', 'submission'])
          .toContain(tab.name);
      });
    });

    it('should return empty array for page with no tabs', () => {
      const html = loadFixture('user-articles-empty.html');
      const tabs = ArticleParser.parseArticleTabs(html);

      // Empty page might still have tabs, just with count 0
      expect(Array.isArray(tabs)).toBe(true);
    });

    it('should parse tab text correctly', () => {
      const sampleHTML = `
        <html>
          <body>
            <button>Drafts3</button>
            <button>Published5</button>
            <button>Unlisted0</button>
          </body>
        </html>
      `;

      const tabs = ArticleParser.parseArticleTabs(sampleHTML);

      expect(tabs).toHaveLength(3);
      expect(tabs[0]).toEqual({ name: 'drafts', count: 3, text: 'Drafts3' });
      expect(tabs[1]).toEqual({ name: 'published', count: 5, text: 'Published5' });
      expect(tabs[2]).toEqual({ name: 'unlisted', count: 0, text: 'Unlisted0' });
    });
  });

  describe('mapTabToStatus()', () => {
    it('should map tab names to article statuses', () => {
      expect(ArticleParser.mapTabToStatus('drafts')).toBe('draft');
      expect(ArticleParser.mapTabToStatus('published')).toBe('published');
      expect(ArticleParser.mapTabToStatus('unlisted')).toBe('unlisted');
      expect(ArticleParser.mapTabToStatus('scheduled')).toBe('scheduled');
      expect(ArticleParser.mapTabToStatus('submissions')).toBe('submission');
      expect(ArticleParser.mapTabToStatus('submission')).toBe('submission');
    });

    it('should return "unknown" for invalid tab names', () => {
      expect(ArticleParser.mapTabToStatus('invalid')).toBe('unknown');
      expect(ArticleParser.mapTabToStatus('')).toBe('unknown');
    });
  });

  describe('extractArticlesFromTable()', () => {
    it('should extract articles from user articles page', () => {
      const html = loadFixture('user-articles-page.html');
      const articles = ArticleParser.extractArticlesFromTable(html, 'draft');

      expect(Array.isArray(articles)).toBe(true);

      // Validate structure of extracted articles
      articles.forEach(article => {
        expect(article.title).toBeDefined();
        expect(typeof article.title).toBe('string');
        expect(article.title.length).toBeGreaterThan(0);

        expect(article.url).toBeDefined();
        expect(typeof article.url).toBe('string');
        expect(article.url).toMatch(/medium\.com/);

        expect(article.status).toBe('draft');
        expect(article.content).toBe(''); // Content not fetched by this method
        expect(Array.isArray(article.tags)).toBe(true);
      });
    });

    it('should handle empty articles table', () => {
      const html = loadFixture('user-articles-empty.html');
      const articles = ArticleParser.extractArticlesFromTable(html, 'draft');

      expect(articles).toEqual([]);
    });

    it('should extract both draft and published URL formats', () => {
      const sampleHTML = `
        <html>
          <body>
            <table>
              <tbody>
                <tr>
                  <td>
                    <h2>Draft Article</h2>
                    <a href="https://medium.com/p/abc123/edit">Edit</a>
                  </td>
                </tr>
                <tr>
                  <td>
                    <h2>Published Article</h2>
                    <a href="https://medium.com/@user/my-article-def456">View</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const articles = ArticleParser.extractArticlesFromTable(sampleHTML, 'draft');

      expect(articles).toHaveLength(2);

      // Draft URL should be converted to public format
      expect(articles[0].url).toBe('https://medium.com/p/abc123');

      // Published URL should be preserved
      expect(articles[1].url).toBe('https://medium.com/@user/my-article-def456');
    });

    it('should extract publish dates when available', () => {
      const sampleHTML = `
        <html>
          <body>
            <table>
              <tbody>
                <tr>
                  <td>
                    <h2>Article with Date</h2>
                    <a href="https://medium.com/p/abc123">Link</a>
                    <div>Published May 13</div>
                  </td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const articles = ArticleParser.extractArticlesFromTable(sampleHTML, 'published');

      expect(articles).toHaveLength(1);
      expect(articles[0].publishDate).toBe('May 13');
    });
  });

  describe('parseUserArticlesPage()', () => {
    it('should parse complete user articles page', () => {
      const html = loadFixture('user-articles-page.html');
      const articles = ArticleParser.parseUserArticlesPage(html, 'drafts');

      expect(Array.isArray(articles)).toBe(true);

      articles.forEach(article => {
        expect(article.title).toBeDefined();
        expect(article.url).toMatch(/medium\.com/);
        expect(article.status).toBe('draft');
      });
    });

    it('should use default status of "draft" if not specified', () => {
      const sampleHTML = `
        <html>
          <body>
            <table>
              <tbody>
                <tr>
                  <td>
                    <h2>Test Article</h2>
                    <a href="https://medium.com/p/test123">Link</a>
                  </td>
                </tr>
              </tbody>
            </table>
          </body>
        </html>
      `;

      const articles = ArticleParser.parseUserArticlesPage(sampleHTML);

      expect(articles[0].status).toBe('draft');
    });
  });
});
