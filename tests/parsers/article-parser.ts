/**
 * Article Parser Module
 *
 * Extracts article parsing logic from browser-client.ts into standalone,
 * testable functions that work with HTML strings (via jsdom).
 *
 * This allows for fast, deterministic unit tests using HTML fixtures
 * instead of requiring live browser automation.
 */

import { parseHTML } from 'linkedom';

export interface ParsedArticle {
  title: string;
  content: string;
  url: string;
  publishDate: string;
  tags: string[];
  status: 'draft' | 'published' | 'unlisted' | 'scheduled' | 'submission' | 'unknown';
}

export interface ArticleTab {
  name: string;
  count: number;
  text: string; // Full text like "Drafts1"
}

export class ArticleParser {
  /**
   * Parse tab navigation to find tabs with articles.
   * Extracts tabs like "Drafts1", "Published5", etc.
   *
   * @param html - HTML content of the /me/stories page
   * @returns Array of tab info with counts
   */
  static parseArticleTabs(html: string): ArticleTab[] {
    const { document } = parseHTML(html);
    const tabs: ArticleTab[] = [];

    // Find all tab elements (buttons or links)
    const tabElements = document.querySelectorAll('button, a');

    tabElements.forEach(el => {
      const text = el.textContent?.trim() || '';

      // Match patterns like "Drafts1", "Published2", "Unlisted0", etc.
      const match = text.match(/^(Drafts|Published|Unlisted|Scheduled|Submissions?)(\d+)?$/);

      if (match) {
        const tabName = match[1].toLowerCase();
        const count = match[2] ? parseInt(match[2], 10) : 0;

        tabs.push({
          name: tabName,
          count,
          text
        });
      }
    });

    return tabs;
  }

  /**
   * Map tab name to article status enum.
   *
   * @param tabName - Name of the tab (e.g., 'drafts', 'published')
   * @returns Article status value
   */
  static mapTabToStatus(tabName: string): ParsedArticle['status'] {
    const statusMap: { [key: string]: ParsedArticle['status'] } = {
      'drafts': 'draft',
      'published': 'published',
      'unlisted': 'unlisted',
      'scheduled': 'scheduled',
      'submissions': 'submission',
      'submission': 'submission'
    };

    return statusMap[tabName] || 'unknown';
  }

  /**
   * Extract articles from table rows in HTML.
   * Handles both draft format (/p/{id}/edit) and published format (/@user/title-id).
   *
   * @param html - HTML content of an article list page
   * @param status - Status to assign to all extracted articles
   * @returns Array of parsed articles
   */
  static extractArticlesFromTable(html: string, status: ParsedArticle['status']): ParsedArticle[] {
    const { document } = parseHTML(html);
    const articles: ParsedArticle[] = [];
    const rows = document.querySelectorAll('table tbody tr');

    rows.forEach((row) => {
      try {
        const h2 = row.querySelector('h2');
        if (!h2) return;

        // Try both link formats:
        // 1. Edit links (drafts): /p/{id}/edit
        // 2. Public links (published): /@username/slug-title-{id}
        let articleUrl = '';
        let articleLink: HTMLAnchorElement | null = null;

        // Try edit link first
        articleLink = row.querySelector<HTMLAnchorElement>('a[href*="/p/"][href*="/edit"]');
        if (articleLink) {
          // Extract ID from edit link and construct public URL
          const href = articleLink.href;
          const match = href.match(/\/p\/([a-f0-9]+)\//);
          if (match) {
            articleUrl = `https://medium.com/p/${match[1]}`;
          }
        } else {
          // Try public link (for published articles)
          articleLink = row.querySelector<HTMLAnchorElement>('a[href*="/@"]');
          if (articleLink) {
            const href = articleLink.href;
            // linkedom returns paths without domain, so add it if missing
            articleUrl = href.startsWith('http') ? href : `https://medium.com${href}`;
          } else {
            // Fallback: Try plain /p/ links (direct article links)
            articleLink = row.querySelector<HTMLAnchorElement>('a[href*="/p/"]');
            if (articleLink) {
              const href = articleLink.href;
              // linkedom returns paths without domain, so add it if missing
              articleUrl = href.startsWith('http') ? href : `https://medium.com${href}`;
            }
          }
        }

        if (!articleUrl) return;

        // Extract metadata
        const rowText = row.textContent || '';
        let publishDate = '';

        // Try to extract date (different formats for different states)
        const publishedMatch = rowText.match(/Published\s+([A-Za-z]+\s+\d+)/); // "Published May 13"
        const updatedMatch = rowText.match(/Updated\s+([^·]+)/); // "Updated just now"
        const readTimeMatch = rowText.match(/(\d+\s+min\s+read)/); // "7 min read"

        if (publishedMatch) {
          publishDate = publishedMatch[1];
        } else if (updatedMatch) {
          publishDate = updatedMatch[1].trim();
        } else if (readTimeMatch) {
          publishDate = readTimeMatch[1];
        }

        articles.push({
          title: h2.textContent?.trim() || '',
          content: '',
          url: articleUrl,
          publishDate,
          tags: [],
          status
        });
      } catch (error) {
        // Skip problematic rows
        console.error('Error extracting article:', error);
      }
    });

    return articles;
  }

  /**
   * Parse a complete user articles page.
   * This is a convenience method that combines tab parsing and article extraction.
   *
   * @param html - HTML content of the /me/stories page
   * @param currentTabName - Name of the currently active tab (e.g., 'drafts', 'published')
   * @returns Array of parsed articles from the current tab
   */
  static parseUserArticlesPage(html: string, currentTabName: string = 'drafts'): ParsedArticle[] {
    const status = this.mapTabToStatus(currentTabName);
    return this.extractArticlesFromTable(html, status);
  }
}
