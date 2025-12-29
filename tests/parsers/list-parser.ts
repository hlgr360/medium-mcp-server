/**
 * List Parser Module
 *
 * Extracts reading list parsing logic from browser-client.ts into standalone,
 * testable functions that work with HTML strings (via jsdom).
 */

import { parseHTML } from 'linkedom';

export interface ParsedList {
  id: string;
  name: string;
  description?: string;
  articleCount?: number;
  url: string;
}

export class ListParser {
  /**
   * Parse reading lists from the /me/lists page HTML.
   *
   * @param html - HTML content of the /me/lists page
   * @returns Array of parsed reading lists
   */
  static parseReadingLists(html: string): ParsedList[] {
    const { document } = parseHTML(html);
    const mediumLists: ParsedList[] = [];

    // Strategy: Look for list containers with data-testid="readingList"
    // This is the most reliable selector based on current Medium UI
    const listSelectors = [
      '[data-testid="readingList"]',          // Primary selector (current UI)
      'a[href*="/list/"]',                    // List links (fallback)
      '[data-testid="list-card"]',            // Alternative test ID
      '.js-listItem',                         // Classic selector
    ];

    let listElements: NodeListOf<Element> | null = null;

    for (const selector of listSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        listElements = elements;
        break;
      }
    }

    if (!listElements || listElements.length === 0) {
      return [];
    }

    // Track seen list IDs to avoid duplicates
    const seenIds = new Set<string>();

    listElements.forEach((listEl) => {
      try {
        // Extract list name - check the container for headings
        const nameSelectors = ['h2', 'h3', 'h1', '[data-testid="readingListName"]', '.list-title'];
        let name = '';
        for (const sel of nameSelectors) {
          const nameEl = listEl.querySelector(sel);
          if (nameEl?.textContent?.trim()) {
            name = nameEl.textContent.trim();
            break;
          }
        }

        if (!name) {
          return; // Skip if no name
        }

        // Extract list URL and ID from link inside or as the element itself
        let listUrl = '';
        let listId = '';

        // Check if the element itself is a link
        if ((listEl as HTMLAnchorElement).href?.includes('/list/')) {
          const href = (listEl as HTMLAnchorElement).href;
          // linkedom returns paths without domain, so add it if missing
          listUrl = href.startsWith('http') ? href.split('?')[0] : `https://medium.com${href.split('?')[0]}`;
        } else {
          // Look for link inside the container
          const linkEl = listEl.querySelector('a[href*="/list/"]');
          if (linkEl && (linkEl as HTMLAnchorElement).href) {
            const href = (linkEl as HTMLAnchorElement).href;
            listUrl = href.startsWith('http') ? href.split('?')[0] : `https://medium.com${href.split('?')[0]}`;
          }
        }

        if (!listUrl) {
          return;
        }

        // Extract list ID from URL
        const idMatch = listUrl.match(/\/list\/([^?/]+)/);
        if (idMatch) {
          listId = idMatch[1];
        }

        if (!listId || seenIds.has(listId)) {
          return; // Skip duplicates
        }
        seenIds.add(listId);

        // Extract description
        const descSelectors = ['p', '.list-description', '[data-testid="list-description"]'];
        let description = '';
        for (const sel of descSelectors) {
          const descEl = listEl.querySelector(sel);
          if (descEl?.textContent?.trim() && descEl.textContent.trim().length > 10) {
            description = descEl.textContent.trim().substring(0, 200);
            break;
          }
        }

        // Extract article count
        let articleCount: number | undefined;
        const countMatch = listEl.textContent?.match(/(\d+)\s+(?:stories|articles)/i);
        if (countMatch) {
          articleCount = parseInt(countMatch[1], 10);
        }

        mediumLists.push({
          id: listId,
          name,
          description: description || undefined,
          articleCount: articleCount,
          url: listUrl || `https://medium.com/list/${listId}`
        });
      } catch (error) {
        // Skip problematic list elements
        console.error('Error extracting list:', error);
      }
    });

    return mediumLists;
  }

  /**
   * Find a specific list URL from the lists page HTML.
   * Helper method for getListArticles().
   *
   * @param html - HTML content of the /me/lists page
   * @param targetListId - The list ID to search for
   * @returns The full list URL or null if not found
   */
  static findListUrl(html: string, targetListId: string): string | null {
    const { document } = parseHTML(html);

    const allLinks = Array.from(document.querySelectorAll('a[href*="/list/"]'));
    for (const link of allLinks) {
      const href = (link as HTMLAnchorElement).href;
      // linkedom returns paths without domain, so add it if missing
      const fullHref = href.startsWith('http') ? href : `https://medium.com${href}`;

      // Check if this link matches our list ID
      const idMatch = fullHref.match(/\/list\/([^?\/]+)/);
      if (idMatch && idMatch[1] === targetListId) {
        return fullHref.split('?')[0]; // Return URL without query params
      }
    }
    return null;
  }

  /**
   * Check if a page is a "list not found" error page.
   *
   * @param html - HTML content of a list page
   * @returns true if the page is an error page
   */
  static isListNotFound(html: string): boolean {
    const { document } = parseHTML(html);

    const pageText = document.body.textContent?.toLowerCase() || '';
    return pageText.includes('not found') ||
           pageText.includes('doesn\'t exist') ||
           document.title.includes('404');
  }
}
