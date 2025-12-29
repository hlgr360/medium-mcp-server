/**
 * Integration Tests for ListParser
 *
 * Tests reading list parsing logic using HTML fixtures.
 */

import { ListParser } from '../parsers/list-parser';
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

describe('ListParser', () => {
  // Auto-capture fixtures if they don't exist
  beforeAll(async () => {
    await ensureFixtures();
  });
  describe('parseReadingLists()', () => {
    it('should parse reading lists from fixture', () => {
      const html = loadFixture('reading-lists-page.html');
      const lists = ListParser.parseReadingLists(html);

      expect(Array.isArray(lists)).toBe(true);

      lists.forEach(list => {
        // Required fields
        expect(list.id).toBeDefined();
        expect(typeof list.id).toBe('string');
        expect(list.id.length).toBeGreaterThan(0);

        expect(list.name).toBeDefined();
        expect(typeof list.name).toBe('string');

        expect(list.url).toBeDefined();
        expect(list.url).toMatch(/medium\.com\/@[^\/]+\/list\//);

        // Optional fields
        if (list.articleCount !== undefined) {
          expect(typeof list.articleCount).toBe('number');
          expect(list.articleCount).toBeGreaterThanOrEqual(0);
        }

        if (list.description) {
          expect(typeof list.description).toBe('string');
        }
      });
    });

    it('should return empty array for page with no lists', () => {
      const html = loadFixture('reading-lists-empty.html');
      const lists = ListParser.parseReadingLists(html);

      expect(lists).toEqual([]);
    });

    it('should extract list metadata correctly', () => {
      const sampleHTML = `
        <html>
          <body>
            <div data-testid="readingList">
              <h2>My Reading List</h2>
              <p>A great collection of articles about programming</p>
              <a href="https://medium.com/@user/list/abc123">View</a>
              <span>5 stories</span>
            </div>
          </body>
        </html>
      `;

      const lists = ListParser.parseReadingLists(sampleHTML);

      expect(lists).toHaveLength(1);
      expect(lists[0].name).toBe('My Reading List');
      expect(lists[0].id).toBe('abc123');
      expect(lists[0].url).toBe('https://medium.com/@user/list/abc123');
      expect(lists[0].articleCount).toBe(5);
      expect(lists[0].description).toContain('great collection');
    });

    it('should handle duplicate list IDs by skipping them', () => {
      const sampleHTML = `
        <html>
          <body>
            <div data-testid="readingList">
              <h2>List One</h2>
              <a href="https://medium.com/@user/list/same-id">View</a>
            </div>
            <div data-testid="readingList">
              <h2>List Two</h2>
              <a href="https://medium.com/@user/list/same-id">View</a>
            </div>
          </body>
        </html>
      `;

      const lists = ListParser.parseReadingLists(sampleHTML);

      // Should only have one list (duplicate skipped)
      expect(lists).toHaveLength(1);
    });

    it('should try fallback selectors if primary selector fails', () => {
      const sampleHTML = `
        <html>
          <body>
            <a href="https://medium.com/@user/list/fallback-test">
              <h2>List via Fallback Selector</h2>
            </a>
          </body>
        </html>
      `;

      const lists = ListParser.parseReadingLists(sampleHTML);

      expect(lists).toHaveLength(1);
      expect(lists[0].name).toBe('List via Fallback Selector');
      expect(lists[0].id).toBe('fallback-test');
    });
  });

  describe('findListUrl()', () => {
    it('should find list URL by ID', () => {
      const sampleHTML = `
        <html>
          <body>
            <a href="https://medium.com/@user/list/abc123">List One</a>
            <a href="https://medium.com/@user/list/def456">List Two</a>
          </body>
        </html>
      `;

      const url = ListParser.findListUrl(sampleHTML, 'def456');

      expect(url).toBe('https://medium.com/@user/list/def456');
    });

    it('should return null if list ID not found', () => {
      const sampleHTML = `
        <html>
          <body>
            <a href="https://medium.com/@user/list/abc123">List One</a>
          </body>
        </html>
      `;

      const url = ListParser.findListUrl(sampleHTML, 'nonexistent');

      expect(url).toBeNull();
    });

    it('should strip query parameters from URL', () => {
      const sampleHTML = `
        <html>
          <body>
            <a href="https://medium.com/@user/list/abc123?source=email">List</a>
          </body>
        </html>
      `;

      const url = ListParser.findListUrl(sampleHTML, 'abc123');

      expect(url).toBe('https://medium.com/@user/list/abc123');
    });
  });

  describe('isListNotFound()', () => {
    it('should detect "not found" error pages', () => {
      const errorHTML = `
        <html>
          <head><title>404 - Not Found</title></head>
          <body>
            <h1>This list was not found</h1>
          </body>
        </html>
      `;

      expect(ListParser.isListNotFound(errorHTML)).toBe(true);
    });

    it('should detect "doesn\'t exist" error messages', () => {
      const errorHTML = `
        <html>
          <body>
            <p>This list doesn't exist</p>
          </body>
        </html>
      `;

      expect(ListParser.isListNotFound(errorHTML)).toBe(true);
    });

    it('should return false for valid list pages', () => {
      const html = loadFixture('reading-lists-page.html');

      expect(ListParser.isListNotFound(html)).toBe(false);
    });
  });
});
