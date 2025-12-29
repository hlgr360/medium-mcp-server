/**
 * Feed Parser Module
 *
 * Extracts feed article card parsing logic from browser-client.ts into standalone,
 * testable functions that work with HTML strings (via jsdom).
 *
 * Used by getFeed() and getListArticles() methods.
 */

import { parseHTML } from 'linkedom';

export interface ParsedFeedArticle {
  title: string;
  excerpt: string;
  url: string;
  author?: string;
  publishDate?: string;
  readTime?: string;
  claps?: number;
  imageUrl?: string;
  feedCategory?: 'featured' | 'for-you' | 'following' | 'all';
}

export class FeedParser {
  /**
   * Extract article cards from a feed or list page HTML.
   *
   * @param html - HTML content of a feed or list page
   * @param limit - Maximum number of articles to extract
   * @param feedCategory - Optional feed category to tag articles
   * @returns Array of parsed feed articles
   */
  static extractArticleCards(
    html: string,
    limit: number = 10,
    feedCategory?: 'featured' | 'for-you' | 'following' | 'all'
  ): ParsedFeedArticle[] {
    const { document } = parseHTML(html);
    const feedArticles: ParsedFeedArticle[] = [];

    // Strategy: Try multiple selectors for article cards (Medium UI varies)
    const articleSelectors = [
      'article',                           // Modern Medium layout
      '[data-testid="story-preview"]',     // Test ID selector
      '[data-testid="story-card"]',        // Alternative test ID
      'div[role="article"]',               // Semantic HTML
      '.js-postListItem',                  // Classic Medium
      '.postArticle',                      // Older layout
      '.streamItem'                        // Stream-based layout
    ];

    let cardElements: NodeListOf<Element> | null = null;

    // Find which selector returns elements
    for (const selector of articleSelectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        cardElements = elements;
        break;
      }
    }

    if (!cardElements || cardElements.length === 0) {
      return [];
    }

    // Extract metadata from each card
    cardElements.forEach((card) => {
      if (feedArticles.length >= limit) return;

      try {
        // Extract title
        const titleSelectors = ['h1', 'h2', 'h3', '[data-testid="story-title"]', '.graf--title'];
        let title = '';
        for (const sel of titleSelectors) {
          const titleEl = card.querySelector(sel);
          if (titleEl?.textContent?.trim()) {
            title = titleEl.textContent.trim();
            break;
          }
        }

        if (!title) return; // Skip if no title

        // Extract excerpt/synopsis
        const excerptSelectors = [
          '.story-excerpt',
          '.post-excerpt',
          '[data-testid="story-excerpt"]',
          '.graf--p',
          'p'
        ];
        let excerpt = '';
        for (const sel of excerptSelectors) {
          const excerptEl = card.querySelector(sel);
          if (excerptEl?.textContent?.trim() && excerptEl.textContent.trim().length > 20) {
            excerpt = excerptEl.textContent.trim().substring(0, 300);
            break;
          }
        }

        // Extract article URL (prefer article link over publication link)
        let url = '';

        // Strategy 1: Try to get link from title element (most reliable)
        for (const sel of titleSelectors) {
          const titleEl = card.querySelector(sel);
          if (titleEl) {
            const titleLink = titleEl.closest('a') || titleEl.querySelector('a');
            if (titleLink && (titleLink as HTMLAnchorElement).href) {
              let href = (titleLink as HTMLAnchorElement).href;
              // linkedom returns paths without domain, so add it if missing
              if (!href.startsWith('http')) {
                href = `https://medium.com${href}`;
              }
              if (href.includes('medium.com') && href.includes('-') &&
                  !href.includes('/search?') && !href.includes('/signin')) {
                url = href.split('?')[0];
                break;
              }
            }
          }
        }

        // Strategy 2: Find all links and pick the article link (not publication link)
        if (!url) {
          const allLinks = Array.from(card.querySelectorAll('a'));
          const articleLinks = allLinks
            .map(link => {
              let href = (link as HTMLAnchorElement).href;
              // linkedom returns paths without domain, so add it if missing
              if (!href.startsWith('http')) {
                href = `https://medium.com${href}`;
              }
              return href;
            })
            .filter(href => {
              if (!href || !href.includes('medium.com')) return false;
              if (href.includes('/search?') || href.includes('/signin')) return false;

              // Article URLs have format: domain/@author/article-slug-id or domain/article-slug-id
              // Publication URLs are just: domain/@publication or domain/
              const urlParts = href.split('medium.com')[1] || '';

              // Must have a hyphen (article slug) and not end with just username
              const hasArticleSlug = urlParts.includes('-');
              const isNotJustProfile = !urlParts.match(/^\/@[^\/]+\/?$/);

              return hasArticleSlug && isNotJustProfile;
            });

          // Pick the longest URL (article URLs are typically longer than publication URLs)
          if (articleLinks.length > 0) {
            url = articleLinks.sort((a, b) => b.length - a.length)[0].split('?')[0];
          }
        }

        if (!url) return; // Skip if no valid URL

        // Extract author
        const authorSelectors = [
          '[data-testid="story-author"]',
          '.postMetaInline-authorLockup',
          '.author-name',
          'a[rel="author"]'
        ];
        let author = '';
        for (const sel of authorSelectors) {
          const authorEl = card.querySelector(sel);
          if (authorEl?.textContent?.trim()) {
            author = authorEl.textContent.trim();
            break;
          }
        }

        // Extract publish date
        const dateText = card.textContent || '';
        let publishDate = '';
        const datePatterns = [
          /(\d+\s+(hour|day|week|month)s?\s+ago)/i,
          /([A-Z][a-z]+\s+\d+)/,  // "Jan 15"
          /(\d+\s+min\s+ago)/i
        ];
        for (const pattern of datePatterns) {
          const match = dateText.match(pattern);
          if (match) {
            publishDate = match[1];
            break;
          }
        }

        // Extract read time
        let readTime = '';
        const readTimeMatch = dateText.match(/(\d+\s+min\s+read)/i);
        if (readTimeMatch) {
          readTime = readTimeMatch[1];
        }

        // Extract claps (if visible)
        let claps = 0;
        const clapMatch = dateText.match(/(\d+(?:K|M)?)\s+claps?/i);
        if (clapMatch) {
          const clapStr = clapMatch[1];
          if (clapStr.includes('K')) {
            claps = parseFloat(clapStr) * 1000;
          } else if (clapStr.includes('M')) {
            claps = parseFloat(clapStr) * 1000000;
          } else {
            claps = parseInt(clapStr, 10);
          }
        }

        // Extract featured image URL
        let imageUrl = '';
        const imgEl = card.querySelector('img');
        if (imgEl && imgEl.src) {
          imageUrl = imgEl.src;
        }

        const article: ParsedFeedArticle = {
          title,
          excerpt,
          url,
          author,
          publishDate,
          readTime,
          claps: claps || undefined,
          imageUrl: imageUrl || undefined
        };

        // Add feedCategory if provided (for 'all' category)
        if (feedCategory) {
          article.feedCategory = feedCategory;
        }

        feedArticles.push(article);
      } catch (error) {
        // Skip problematic cards
        console.error('Error extracting article card:', error);
      }
    });

    return feedArticles;
  }
}
