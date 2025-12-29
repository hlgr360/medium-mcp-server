/**
 * Content Parser Module
 *
 * Extracts article content parsing logic from browser-client.ts into standalone,
 * testable functions that work with HTML strings (via jsdom).
 */

import { parseHTML } from 'linkedom';

export interface ContentExtractionResult {
  content: string;
  isPaywalled: boolean;
  isPreview: boolean;
  foundIndicators?: string[];
}

export class ContentParser {
  /**
   * Extract article content from HTML with multiple fallback strategies.
   *
   * @param html - HTML content of an article page
   * @returns Extracted content with metadata about paywalls/previews
   */
  static extractArticleContent(html: string): ContentExtractionResult {
    const { document } = parseHTML(html);
    let extractedContent = '';
    let isPaywalled = false;
    let isPreview = false;
    const foundIndicators: string[] = [];

    // Strategy 1: Try modern Medium article selectors
    const modernSelectors = [
      'article section p',
      'article div[data-testid="story-content"] p',
      '[data-testid="story-content"] p',
      'article section div p',
      'article p'
    ];

    // Strategy 2: Try classic Medium selectors
    const classicSelectors = [
      '.postArticle-content p',
      '.section-content p',
      '.graf--p',
      '.postArticle p'
    ];

    // Strategy 3: Generic content selectors
    const genericSelectors = [
      'main p',
      '[role="main"] p',
      '.story p',
      '.post p'
    ];

    const allSelectors = [...modernSelectors, ...classicSelectors, ...genericSelectors];

    // Try each selector strategy
    for (const selector of allSelectors) {
      const elements = document.querySelectorAll(selector);

      if (elements.length >= 2) { // Need at least a couple paragraphs for meaningful content
        const paragraphs: string[] = [];

        elements.forEach((element) => {
          const text = element.textContent?.trim();
          if (text && text.length > 20) { // Filter out very short paragraphs
            paragraphs.push(text);
          }
        });

        if (paragraphs.length >= 2) { // Need at least 2 meaningful paragraphs
          extractedContent = paragraphs.join('\n\n');
          break;
        }
      }
    }

    // Fallback: Try to get any substantial text content
    if (!extractedContent) {
      const fallbackSelectors = [
        'article',
        'main',
        '[role="main"]',
        '.story',
        '.post'
      ];

      for (const selector of fallbackSelectors) {
        const element = document.querySelector(selector);
        if (element) {
          const text = element.textContent?.trim();
          if (text && text.length > 50) {
            // Clean up the text a bit
            extractedContent = text
              .replace(/\s+/g, ' ') // Normalize whitespace
              .replace(/(.{100})/g, '$1\n\n') // Add paragraph breaks
              .substring(0, 5000); // Limit length

            break;
          }
        }
      }
    }

    // Check for paywall if no content found
    if (!extractedContent) {
      const paywallIndicators = [
        'sign up',
        'subscribe',
        'member-only',
        'paywall',
        'premium',
        'upgrade'
      ];

      const pageText = document.body.textContent?.toLowerCase() || '';
      const found = paywallIndicators.filter(indicator =>
        pageText.includes(indicator)
      );

      if (found.length > 0) {
        isPaywalled = true;
        foundIndicators.push(...found);
        return {
          content: `Content may be behind a paywall or require login. Found indicators: ${found.join(', ')}`,
          isPaywalled: true,
          isPreview: false,
          foundIndicators: found
        };
      }

      return {
        content: 'Unable to extract article content. The article may be behind a paywall, require login, or use an unsupported layout.',
        isPaywalled: false,
        isPreview: false
      };
    }

    // Check if we might be getting only a preview (very short content)
    if (extractedContent.length < 500) {
      const previewIndicators = [
        'continue reading',
        'read more',
        'member-only story',
        'this story is for members only',
        'become a member',
        'sign up to continue',
        'subscribe to read'
      ];

      const pageText = document.body.textContent?.toLowerCase() || '';
      const found = previewIndicators.filter(indicator =>
        pageText.includes(indicator)
      );

      if (found.length > 0) {
        isPreview = true;
        foundIndicators.push(...found);
        extractedContent = `[PREVIEW ONLY - Login required for full content]\n\n${extractedContent}\n\n[This appears to be only a preview. The full article requires Medium membership or login. Found indicators: ${found.join(', ')}]`;
      }
    }

    return {
      content: extractedContent,
      isPaywalled,
      isPreview,
      foundIndicators: foundIndicators.length > 0 ? foundIndicators : undefined
    };
  }

  /**
   * Simple content extraction without paywall checking (for tests).
   *
   * @param html - HTML content of an article page
   * @returns Extracted content string
   */
  static extractContent(html: string): string {
    return this.extractArticleContent(html).content;
  }
}
