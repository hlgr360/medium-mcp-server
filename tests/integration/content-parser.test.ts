/**
 * Integration Tests for ContentParser
 *
 * Tests article content extraction logic using HTML fixtures.
 */

import { ContentParser } from '../parsers/content-parser';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { ensureFixtures } from '../helpers/ensure-fixtures';

const fixturesDir = join(__dirname, '..', 'fixtures');

function loadFixture(filename: string): string {
  const path = join(fixturesDir, filename);
  if (!existsSync(path)) {
    throw new Error(`Fixture not found: ${filename}. Run: npx ts-node scripts/capture-fixtures.ts`);
  }
  return readFileSync(path, 'utf-8');
}

describe('ContentParser', () => {
  // Auto-capture fixtures if they don't exist
  beforeAll(async () => {
    await ensureFixtures();
  });
  describe('extractArticleContent()', () => {
    it('should extract content from public article fixture', () => {
      const html = loadFixture('article-content-public.html');
      const result = ContentParser.extractArticleContent(html);

      expect(result.content).toBeDefined();
      expect(typeof result.content).toBe('string');
      expect(result.content.length).toBeGreaterThan(100);

      // Public article should not be paywalled
      expect(result.isPaywalled).toBe(false);

      // Should have newlines (multi-paragraph)
      expect(result.content).toContain('\n');
    });

    it('should extract multi-paragraph content correctly', () => {
      const sampleHTML = `
        <html>
          <body>
            <article>
              <section>
                <p>First paragraph with enough text to be meaningful and not filtered out by length check.</p>
                <p>Second paragraph also has substantial content that should be extracted properly.</p>
                <p>Third paragraph ensures we meet the minimum paragraph requirement for extraction.</p>
                <p>Fourth paragraph to add more content to the article.</p>
              </section>
            </article>
          </body>
        </html>
      `;

      const result = ContentParser.extractArticleContent(sampleHTML);

      expect(result.content).toContain('First paragraph');
      expect(result.content).toContain('Second paragraph');
      expect(result.content).toContain('Third paragraph');
      expect(result.content).toContain('Fourth paragraph');

      // Should have paragraph separators
      expect(result.content).toContain('\n\n');

      expect(result.isPaywalled).toBe(false);
      expect(result.isPreview).toBe(false);
    });

    it('should detect paywall indicators', () => {
      const paywallHTML = `
        <html>
          <body>
            <div>
              <p>Sign up to continue reading</p>
              <p>This is a member-only story</p>
              <p>Subscribe to Medium for full access</p>
            </div>
          </body>
        </html>
      `;

      const result = ContentParser.extractArticleContent(paywallHTML);

      expect(result.isPaywalled).toBe(true);
      expect(result.content).toContain('paywall');
      expect(result.foundIndicators).toBeDefined();
      expect(result.foundIndicators!.length).toBeGreaterThan(0);
    });

    it('should detect preview-only content', () => {
      const previewHTML = `
        <html>
          <body>
            <article>
              <section>
                <p>This is a short preview of the article with limited content.</p>
              </section>
            </article>
            <div>Continue reading to see the full story. Become a member today!</div>
          </body>
        </html>
      `;

      const result = ContentParser.extractArticleContent(previewHTML);

      expect(result.isPreview).toBe(true);
      expect(result.content).toContain('PREVIEW ONLY');
      expect(result.foundIndicators).toBeDefined();
    });

    it('should use fallback extraction for non-standard layouts', () => {
      const nonStandardHTML = `
        <html>
          <body>
            <main>
              <div class="custom-content">
                Lorem ipsum dolor sit amet, consectetur adipiscing elit.
                Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.
                Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris.
                Nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor.
              </div>
            </main>
          </body>
        </html>
      `;

      const result = ContentParser.extractArticleContent(nonStandardHTML);

      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content).toContain('Lorem ipsum');
    });

    it('should filter out very short paragraphs', () => {
      const sampleHTML = `
        <html>
          <body>
            <article>
              <section>
                <p>Short</p>
                <p>This is a meaningful paragraph with enough content to be included in extraction.</p>
                <p>x</p>
                <p>Another substantial paragraph that should definitely be extracted from the article.</p>
              </section>
            </article>
          </body>
        </html>
      `;

      const result = ContentParser.extractArticleContent(sampleHTML);

      // Should include long paragraphs
      expect(result.content).toContain('meaningful paragraph');
      expect(result.content).toContain('substantial paragraph');

      // Should not include very short paragraphs (< 20 chars)
      expect(result.content.split('\n\n').filter(p => p === 'Short' || p === 'x')).toHaveLength(0);
    });

    it('should handle articles with classic Medium selectors', () => {
      const classicHTML = `
        <html>
          <body>
            <div class="postArticle-content">
              <p class="graf--p">First paragraph in classic Medium format with sufficient length.</p>
              <p class="graf--p">Second paragraph also using the classic Medium CSS classes for styling.</p>
              <p class="graf--p">Third paragraph to ensure we have enough content for extraction.</p>
            </div>
          </body>
        </html>
      `;

      const result = ContentParser.extractArticleContent(classicHTML);

      expect(result.content).toContain('First paragraph');
      expect(result.content).toContain('Second paragraph');
      expect(result.isPaywalled).toBe(false);
    });
  });

  describe('extractContent()', () => {
    it('should return content string directly', () => {
      const sampleHTML = `
        <html>
          <body>
            <article>
              <section>
                <p>Simple content extraction test with enough text to pass minimum length requirements.</p>
                <p>Another paragraph to ensure we meet the minimum paragraph count for successful extraction.</p>
                <p>Third paragraph completing the set of required content for this test case to pass.</p>
              </section>
            </article>
          </body>
        </html>
      `;

      const content = ContentParser.extractContent(sampleHTML);

      expect(typeof content).toBe('string');
      expect(content).toContain('Simple content');
      expect(content).toContain('Another paragraph');
    });

    it('should match extractArticleContent().content', () => {
      const html = loadFixture('article-content-public.html');

      const simpleResult = ContentParser.extractContent(html);
      const fullResult = ContentParser.extractArticleContent(html);

      expect(simpleResult).toBe(fullResult.content);
    });
  });
});
