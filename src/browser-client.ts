import { chromium as playwrightChromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { Browser, Page, BrowserContext, BrowserContextOptions } from 'playwright';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { logger } from './logger';

// Enable stealth plugin to bypass bot detection (Cloudflare, etc.)
playwrightChromium.use(StealthPlugin());

export interface MediumArticle {
  title: string;
  content: string;
  url?: string;
  publishDate?: string;
  tags?: string[];
  claps?: number;
  status?: 'draft' | 'published' | 'unlisted' | 'scheduled' | 'submission' | 'unknown';
}

/**
 * Represents an article header visible on Medium feeds and lists.
 * Contains only metadata visible without clicking into the article.
 */
export interface MediumFeedArticle {
  title: string;           // Article headline
  excerpt: string;         // Synopsis/preview text visible on feed
  url: string;             // Full article URL
  author?: string;         // Author name if visible
  publishDate?: string;    // Publication date (e.g., "2 days ago", "Jan 15")
  readTime?: string;       // Estimated read time (e.g., "5 min read")
  claps?: number;          // Clap count if visible
  imageUrl?: string;       // Featured image URL if visible
  feedCategory?: FeedCategory; // Source feed (when using 'all' category)
}

/**
 * Represents a Medium reading list (collection).
 */
export interface MediumList {
  id: string;              // List ID (extracted from URL)
  name: string;            // List name/title
  description?: string;    // List description if visible
  articleCount?: number;   // Number of articles in list
  url?: string;            // Full list URL
}

/**
 * Feed category for get-feed tool.
 * Use 'all' to fetch from all feeds with articles tagged by source.
 */
export type FeedCategory = 'featured' | 'for-you' | 'following' | 'all';

export interface PublishOptions {
  title: string;
  content: string;
  tags?: string[];
  isDraft?: boolean;
}

/**
 * Simplified storage state structure for session validation.
 * Based on Playwright's storage state format.
 */
interface StorageState {
  cookies?: Array<{
    name: string;
    value: string;
    domain: string;
    path: string;
    expires: number;
    httpOnly?: boolean;
    secure?: boolean;
    sameSite?: 'Strict' | 'Lax' | 'None';
  }>;
  origins?: Array<{
    origin: string;
    localStorage: Array<{ name: string; value: string }>;
  }>;
}

export class BrowserMediumClient {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  // Use __dirname to get the script's directory, then go up to project root
  // This ensures session file is in project directory, not working directory
  private sessionPath: string;
  private isAuthenticatedSession: boolean = false;

  constructor(sessionPath?: string) {
    // Allow custom session path for testing, default to main session file
    this.sessionPath = sessionPath || join(__dirname, '..', 'medium-session.json');
  }

  // Configuration constants
  private static readonly TIMEOUTS = {
    LOGIN: 300_000,           // 5 minutes - user login interaction
    PAGE_LOAD: 60_000,        // 60 seconds - article content loading
    SHORT_WAIT: 2_000,        // 2 seconds - UI element appearance
    CONTENT_WAIT: 3_000,      // 3 seconds - dynamic content loading
    EDITOR_LOAD: 15_000,      // 15 seconds - rich text editor initialization
    NETWORK_IDLE: 10_000      // 10 seconds - network activity settlement
  } as const;

  private static readonly VIEWPORT = {
    WIDTH: 1280,
    HEIGHT: 720
  } as const;

  private static readonly CLAP_MULTIPLIERS = {
    K: 1_000,
    M: 1_000_000
  } as const;

  /**
   * Initialize the browser for automation.
   * @param forceHeadless - Optional parameter to force headless mode. If not provided, uses shouldUseHeadlessMode().
   */
  async initialize(forceHeadless?: boolean): Promise<void> {
    // IMPORTANT: Check session file FIRST to set isAuthenticatedSession
    // This must happen BEFORE determining headless mode
    const contextOptions: BrowserContextOptions = {
      viewport: { width: BrowserMediumClient.VIEWPORT.WIDTH, height: BrowserMediumClient.VIEWPORT.HEIGHT },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    };

    // Pre-validate session file to set isAuthenticatedSession flag
    if (existsSync(this.sessionPath)) {
      try {
        const sessionData = JSON.parse(readFileSync(this.sessionPath, 'utf8'));
        // Validate session before loading (check cookie expiry)
        if (this.validateStorageState(sessionData)) {
          contextOptions.storageState = sessionData;
          this.isAuthenticatedSession = true;
        } else {
          this.isAuthenticatedSession = false;
        }
      } catch (error) {
        this.isAuthenticatedSession = false;
      }
    }

    // NOW determine headless mode (after isAuthenticatedSession is set)
    const headlessMode = forceHeadless ?? this.shouldUseHeadlessMode();

    // Diagnostic logging (suppressed in test environment)
    logger.debug('═══════════════════════════════════════');
    logger.debug('🔧 INITIALIZE DIAGNOSTICS');
    logger.debug(`   Working directory: ${process.cwd()}`);
    logger.debug(`   Session path: ${this.sessionPath}`);
    logger.debug(`   Session file exists: ${existsSync(this.sessionPath)}`);
    logger.debug(`   isAuthenticatedSession: ${this.isAuthenticatedSession}`);
    logger.debug(`   Headless mode: ${headlessMode}`);
    logger.debug('═══════════════════════════════════════\n');

    this.browser = await playwrightChromium.launch({
      headless: headlessMode, // Dynamic: visible for initial login, headless after
      slowMo: 100, // Slow down for reliability
      args: [
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-blink-features=AutomationControlled',
        '--disable-features=VizDisplayCompositor',
        '--disable-web-security',
        '--disable-features=TranslateUI',
        '--disable-ipc-flooding-protection',
        '--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      ]
    });

    // Log session loading result
    if (this.isAuthenticatedSession) {
      logger.info('✅ Loaded valid session from file');
    } else if (existsSync(this.sessionPath)) {
      logger.warn('⚠️  Session file has expired cookies, will re-authenticate');
    }

    this.context = await this.browser.newContext(contextOptions);
    
    // Add script to remove webdriver property
    await this.context.addInitScript(() => {
      Object.defineProperty(navigator, 'webdriver', {
        get: () => undefined,
      });
      
      // Remove automation indicators
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Array;
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Promise;
      delete (window as any).cdc_adoQpoasnfa76pfcZLmcfl_Symbol;
    });
    
    this.page = await this.context.newPage();
  }

  /**
   * Check if navigating to /m/signin redirects to another page (indicating logged in status).
   * Fast method to detect if session is still valid.
   * @returns true if already logged in, false if stayed on login page
   */
  private async checkLoginRedirect(): Promise<boolean> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    logger.debug('🌐 Navigating to login page to check session...');
    await this.page.goto('https://medium.com/m/signin');
    await this.page.waitForLoadState('networkidle');

    // Check if we got redirected (means we're already logged in)
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/m/signin')) {
      // We got redirected away from login page - we're logged in!
      logger.trace(`✅ Already logged in (redirected to ${currentUrl})`);
      return true;
    }

    return false;
  }

  /**
   * Detect login state by checking for user UI elements on the current page.
   * @returns true if login indicators found, false otherwise
   */
  private async detectLoginIndicators(): Promise<boolean> {
    if (!this.page) return false;

    logger.debug('🔍 On signin page, checking if already logged in...');

    // Wait a moment for any dynamic content to load
    await this.page.waitForTimeout(BrowserMediumClient.TIMEOUTS.SHORT_WAIT);

    const loginIndicators = [
      '[data-testid="headerUserIcon"]',
      '[data-testid="headerWriteButton"]',
      '[data-testid="headerNotificationButton"]',
      'button[aria-label*="user"]'
    ];

    for (const selector of loginIndicators) {
      try {
        await this.page.waitForSelector(selector, { timeout: BrowserMediumClient.TIMEOUTS.SHORT_WAIT });
        logger.info(`✅ Already logged in (found ${selector} on signin page)`);
        return true;
      } catch {
        // Try next selector
      }
    }

    return false;
  }

  /**
   * Wait for user to complete manual login in browser.
   * @returns true if login successful, false if timeout
   */
  private async waitForUserLogin(): Promise<boolean> {
    if (!this.page) return false;

    logger.info('⏳ Waiting for you to complete login in the browser...');
    logger.info('');
    logger.info('🔐 LOGIN INSTRUCTIONS:');
    logger.info('   1. In the opened browser, choose "Sign in with email"');
    logger.info('   2. Use your Medium email/password (avoid Google login if possible)');
    logger.info('   3. If you must use Google login:');
    logger.info('      - Try clicking "Sign in with Google"');
    logger.info('      - If blocked, manually navigate to medium.com in a regular browser');
    logger.info('      - Login there first, then come back to this automated browser');
    logger.info('   4. Complete any 2FA if prompted');
    logger.info('   5. The script will continue automatically once logged in...');
    logger.info('');

    // Wait for successful login (user button appears)
    try {
      await this.page.waitForSelector(
        '[data-testid="headerUserIcon"], [data-testid="headerWriteButton"], button[aria-label*="user"]',
        { timeout: BrowserMediumClient.TIMEOUTS.LOGIN }
      );
      logger.info('✅ Login successful!');
      return true;
    } catch (error) {
      logger.warn('❌ Login timeout. Please try again.');
      return false;
    }
  }

  /**
   * Ensure user is logged into Medium.
   * Uses fast redirect check, then waits for manual login if needed.
   * @returns true if logged in successfully
   */
  async ensureLoggedIn(): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    // Check if we have a saved session
    const hasSession = existsSync(this.sessionPath);
    if (hasSession) {
      logger.debug('💾 Found existing session file, checking if still valid...');
    } else {
      logger.warn('🔐 No session file found, need to login');
    }

    // Quick check via redirect
    const alreadyLoggedIn = await this.checkLoginRedirect();
    if (alreadyLoggedIn) {
      await this.saveSession();
      return true;
    }

    // Double-check with login indicators
    const hasIndicators = await this.detectLoginIndicators();
    if (hasIndicators) {
      await this.saveSession();
      return true;
    }

    // Debug: Check what's actually on the page
    const pageInfo = await this.page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button')).slice(0, 5).map(b => b.textContent?.trim());
      const testIds = Array.from(document.querySelectorAll('[data-testid]')).slice(0, 10).map(el => el.getAttribute('data-testid'));
      return { buttons, testIds, title: document.title, url: window.location.href };
    });
    logger.warn('📄 Page info:', JSON.stringify(pageInfo, null, 2));

    // Not logged in - need to restart browser in non-headless mode for user login
    logger.info('⏳ Not logged in, waiting for authentication...');

    if (this.isAuthenticatedSession && this.browser) {
      // We're in headless mode but need user login - restart browser in visible mode
      logger.warn('⚠️  Browser in headless mode but login required - restarting in visible mode...');
      await this.close();
      await this.initialize(false); // Force non-headless
      await this.page!.goto('https://medium.com/m/signin');
      await this.page!.waitForLoadState('networkidle');
    }

    // Wait for user to login
    const loginSuccess = await this.waitForUserLogin();

    if (loginSuccess) {
      await this.saveSession();
    }

    return loginSuccess;
  }

  /**
   * Save the current browser session (cookies, localStorage) to disk for reuse.
   * Includes IndexedDB if supported by the Playwright version.
   */
  async saveSession(): Promise<void> {
    if (!this.context) return;

    try {
      // Attempt to capture IndexedDB along with cookies and localStorage
      // Note: IndexedDB capture support may vary by Playwright version
      const sessionData = await this.context.storageState();

      // Diagnostic logging
      logger.debug('═══════════════════════════════════════');
      logger.debug('💾 SAVING SESSION');
      logger.debug(`   Path: ${this.sessionPath}`);
      logger.debug(`   Working dir: ${process.cwd()}`);

      writeFileSync(this.sessionPath, JSON.stringify(sessionData, null, 2));
      this.isAuthenticatedSession = true;

      // Verify file was written
      const fileExists = existsSync(this.sessionPath);
      logger.debug(`   File written: ${fileExists ? '✅ YES' : '❌ NO'}`);
      if (fileExists) {
        const fs = require('fs');
        const stats = fs.statSync(this.sessionPath);
        logger.debug(`   File size: ${stats.size} bytes`);
      }
      logger.debug('═══════════════════════════════════════\n');

      logger.info('💾 Session saved for future use');

      // Debug logging: show cookie expiry information
      const earliestExpiry = this.getEarliestCookieExpiry(sessionData);
      if (earliestExpiry) {
        const expiryDate = new Date(earliestExpiry * 1000);
        logger.debug(`📅 Session valid until: ${expiryDate.toISOString()}`);
      }

      const cookieCount = sessionData.cookies?.length || 0;
      const originsCount = sessionData.origins?.length || 0;
      logger.debug(`📊 Saved ${cookieCount} cookies and ${originsCount} localStorage origins`);

    } catch (error) {
      logger.error('❌ Failed to save session:', error);
      this.isAuthenticatedSession = false;
    }
  }

  /**
   * Parse tab navigation to find tabs with articles.
   * @returns Array of tab info: { name: string, count: number, selector: string }
   */
  private async parseArticleTabs(): Promise<Array<{ name: string; count: number; selector: string }>> {
    if (!this.page) return [];

    return await this.page.evaluate(() => {
      const tabs: Array<{ name: string; count: number; selector: string }> = [];

      // Find all tab elements (buttons or links)
      const tabElements = document.querySelectorAll('button, a');

      tabElements.forEach(el => {
        const text = el.textContent?.trim() || '';

        // Match patterns like "Drafts1", "Published2", "Unlisted0", etc.
        const match = text.match(/^(Drafts|Published|Unlisted|Scheduled|Submissions?)(\d+)?$/);

        if (match) {
          const tabName = match[1].toLowerCase();
          const count = match[2] ? parseInt(match[2], 10) : 0;

          // Store selector for clicking this tab
          const selector = `button:has-text("${text}"), a:has-text("${text}")`;

          tabs.push({ name: tabName, count, selector });
        }
      });

      return tabs;
    });
  }

  /**
   * Map tab name to article status.
   * @param tabName - Name of the tab (e.g., 'drafts', 'published')
   * @returns Article status enum value
   */
  private mapTabToStatus(tabName: string): MediumArticle['status'] {
    const statusMap: { [key: string]: MediumArticle['status'] } = {
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
   * Extract articles from table rows on the current page.
   * @param status - Status to assign to extracted articles
   * @returns Array of articles with metadata
   */
  private async extractArticlesFromTable(status: string): Promise<MediumArticle[]> {
    if (!this.page) return [];

    return await this.page.evaluate((status: string) => {
      // Define article structure for browser context (can't use full MediumArticle type here)
      const articles: Array<{
        title: string;
        content: string;
        url: string;
        publishDate: string;
        tags: string[];
        status: 'draft' | 'published' | 'unlisted' | 'scheduled' | 'submission' | 'unknown';
      }> = [];
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
            const match = articleLink.href.match(/\/p\/([a-f0-9]+)\//);
            if (match) {
              articleUrl = `https://medium.com/p/${match[1]}`;
            }
          } else {
            // Try public link (for published articles)
            articleLink = row.querySelector<HTMLAnchorElement>('a[href*="/@"]');
            if (articleLink) {
              articleUrl = articleLink.href;
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
            status: status as 'draft' | 'published' | 'unlisted' | 'scheduled' | 'submission' | 'unknown'
          });
        } catch (error) {
          console.error('Error extracting article:', error);
        }
      });

      return articles;
    }, status);
  }

  /**
   * Retrieve all user's Medium articles across all tabs (drafts, published, etc.).
   * @returns Array of articles with status tags
   */
  async getUserArticles(): Promise<MediumArticle[]> {
    if (!this.page) throw new Error('Browser not initialized');

    await this.ensureLoggedIn();

    // Navigate to main stories page
    logger.info('📚 Fetching all user articles from all tabs...');
    await this.page.goto('https://medium.com/me/stories', {
      waitUntil: 'domcontentloaded',
      timeout: BrowserMediumClient.TIMEOUTS.PAGE_LOAD
    });
    await this.page.waitForTimeout(BrowserMediumClient.TIMEOUTS.SHORT_WAIT);

    // Parse tab names to find which tabs have articles
    const tabsWithCounts = await this.parseArticleTabs();
    logger.debug(`Found tabs: ${tabsWithCounts.map(t => `${t.name}(${t.count})`).join(', ')}`);

    // Collect all articles from all tabs
    const allArticles: MediumArticle[] = [];

    // Scrape each tab that has articles
    for (const tab of tabsWithCounts) {
      if (tab.count === 0) {
        logger.debug(`⏭️  Skipping ${tab.name} (0 articles)`);
        continue;
      }

      logger.info(`\n📑 Fetching from ${tab.name} tab (${tab.count} articles)...`);

      try {
        // Click the tab
        const tabElement = this.page.locator(tab.selector).first();
        await tabElement.click();

        // Wait for URL to change
        await this.page.waitForTimeout(1000);

        // Wait for network to be idle
        await this.page.waitForLoadState('networkidle', { timeout: BrowserMediumClient.TIMEOUTS.NETWORK_IDLE }).catch(() => {
          logger.warn('  ⚠️  Network idle timeout, continuing anyway...');
        });

        // Additional wait for DOM updates
        await this.page.waitForTimeout(1000);

        // Extract articles from this tab
        const status = this.mapTabToStatus(tab.name);
        const tabArticles = await this.extractArticlesFromTable(status as string);

        logger.trace(`  ✅ Found ${tabArticles.length} article(s)`);
        tabArticles.forEach((article: MediumArticle) => {
          logger.trace(`     - "${article.title}"`);
        });

        allArticles.push(...tabArticles);

      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        logger.error(`  ❌ Error fetching ${tab.name}: ${message}`);
      }
    }

    logger.info(`\n✅ Total articles collected: ${allArticles.length}`);
    return allArticles;
  }

  async getArticleContent(url: string, requireLogin: boolean = true): Promise<string> {
    if (!this.page) throw new Error('Browser not initialized');

    logger.info(`📖 Fetching article content from: ${url}`);

    // Trust that session was already validated during initialization
    // If session exists, assume we're logged in (validated by validateSessionFast earlier)
    let isLoggedIn = this.isAuthenticatedSession;

    if (isLoggedIn) {
      logger.info('✅ Using authenticated session for full content access');
    } else if (requireLogin) {
      logger.info('🔐 No authenticated session. Attempting login for full content access...');
      isLoggedIn = await this.ensureLoggedIn();
    } else {
      logger.info('🔓 No login required. Will get preview content only.');
    }

    if (!isLoggedIn && requireLogin) {
      logger.warn('⚠️  Warning: Login failed. You may only get partial content (preview).');
    }

    try {
      logger.debug(`🌐 Navigating to article: ${url}`);
      // Use 'domcontentloaded' instead of 'networkidle' - more reliable for heavy pages
      // with lots of tracking/analytics that may never reach networkidle
      await this.page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: BrowserMediumClient.TIMEOUTS.PAGE_LOAD
      });

      // Wait a bit for dynamic content to load
      await this.page.waitForTimeout(BrowserMediumClient.TIMEOUTS.CONTENT_WAIT);

      logger.debug('📄 Page loaded, extracting content...');

      // Extract article content with multiple strategies
      const content = await this.page.evaluate(() => {
        const log = (...args: any[]) => {
          // Silent in browser context to avoid JSON interference
        };
        
        log('🔍 Starting content extraction...');
        
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
        let extractedContent = '';
        
        // Try each selector strategy
        for (const selector of allSelectors) {
          const elements = document.querySelectorAll(selector);
          log(`🎯 Selector "${selector}" found ${elements.length} paragraphs`);
          
          if (elements.length > 3) { // Need at least a few paragraphs for meaningful content
            const paragraphs: string[] = [];
            
            elements.forEach((element, index) => {
              const text = element.textContent?.trim();
              if (text && text.length > 20) { // Filter out very short paragraphs
                paragraphs.push(text);
              }
            });
            
            if (paragraphs.length > 2) { // Need meaningful content
              extractedContent = paragraphs.join('\n\n');
              log(`✅ Successfully extracted ${paragraphs.length} paragraphs using: ${selector}`);
              break;
            }
          }
        }
        
        // Fallback: Try to get any substantial text content
        if (!extractedContent) {
          log('🔄 Trying fallback content extraction...');
          
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
              if (text && text.length > 200) {
                // Clean up the text a bit
                extractedContent = text
                  .replace(/\s+/g, ' ') // Normalize whitespace
                  .replace(/(.{100})/g, '$1\n\n') // Add paragraph breaks
                  .substring(0, 5000); // Limit length
                
                log(`✅ Fallback extraction successful using: ${selector}`);
                break;
              }
            }
          }
        }
        
        // Debug info if still no content
        if (!extractedContent) {
          log('❌ No content found. Page analysis:');
          log('Page title:', document.title);
          log('Page URL:', window.location.href);
          log('Body text length:', document.body.textContent?.length || 0);
          
          // Check if we hit a paywall or login requirement
          const paywallIndicators = [
            'sign up',
            'subscribe',
            'member-only',
            'paywall',
            'premium',
            'upgrade'
          ];
          
          const pageText = document.body.textContent?.toLowerCase() || '';
          const foundIndicators = paywallIndicators.filter(indicator => 
            pageText.includes(indicator)
          );
          
          if (foundIndicators.length > 0) {
            log('🚫 Possible paywall detected:', foundIndicators);
            return `Content may be behind a paywall or require login. Found indicators: ${foundIndicators.join(', ')}`;
          }
          
          return 'Unable to extract article content. The article may be behind a paywall, require login, or use an unsupported layout.';
        }
        
        // Check if we might be getting only a preview (very short content)
        if (extractedContent.length < 500) {
          log('⚠️  Warning: Content seems short, might be preview only');
          
          // Look for "continue reading" or member-only indicators
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
          const foundPreviewIndicators = previewIndicators.filter(indicator => 
            pageText.includes(indicator)
          );
          
          if (foundPreviewIndicators.length > 0) {
            log('🔒 Preview-only content detected:', foundPreviewIndicators);
            extractedContent = `[PREVIEW ONLY - Login required for full content]\n\n${extractedContent}\n\n[This appears to be only a preview. The full article requires Medium membership or login. Found indicators: ${foundPreviewIndicators.join(', ')}]`;
          }
        }
        
        log(`📊 Final content length: ${extractedContent.length} characters`);
        return extractedContent;
      });

      logger.debug(`✅ Content extraction completed. Length: ${content.length} characters`);
      return content;

    } catch (error) {
      logger.error('❌ Error fetching article content:', error);
      throw new Error(`Failed to fetch article content: ${error}`);
    }
  }

  async publishArticle(options: PublishOptions): Promise<{ success: boolean; url?: string; error?: string }> {
    if (!this.page) throw new Error('Browser not initialized');
    
    await this.ensureLoggedIn();

    try {
      // Navigate to the new story page
      await this.page.goto('https://medium.com/new-story');
      await this.page.waitForLoadState('networkidle');

      // Wait for the editor to load (Medium changed selectors in late 2024)
      await this.page.waitForSelector('[data-testid="editorTitleParagraph"]', { timeout: BrowserMediumClient.TIMEOUTS.EDITOR_LOAD });

      // Add title using new selector
      const titleSelector = '[data-testid="editorTitleParagraph"]';
      await this.page.click(titleSelector);
      await this.page.fill(titleSelector, options.title);

      // Add content using new selector
      const contentSelector = '[data-testid="editorParagraphText"]';
      await this.page.waitForSelector(contentSelector, { timeout: BrowserMediumClient.TIMEOUTS.NETWORK_IDLE });
      await this.page.click(contentSelector);
      
      // Split content into paragraphs and add them
      const paragraphs = options.content.split('\n\n').filter(p => p.trim());
      for (let i = 0; i < paragraphs.length; i++) {
        if (i > 0) {
          await this.page.keyboard.press('Enter');
          await this.page.keyboard.press('Enter');
        }
        await this.page.keyboard.type(paragraphs[i]);
      }

      // Add tags if provided
      if (options.tags && options.tags.length > 0) {
        // Look for publish button to access settings
        const publishButton = await this.page.locator('button:has-text("Publish"), [data-testid="publish-button"]').first();
        if (await publishButton.isVisible()) {
          await publishButton.click();
          
          // Wait for publish modal and add tags
          await this.page.waitForSelector('[data-testid="tag-input"], input[placeholder*="tag"]', { timeout: 5000 });
          
          for (const tag of options.tags) {
            await this.page.fill('[data-testid="tag-input"], input[placeholder*="tag"]', tag);
            await this.page.keyboard.press('Enter');
          }
        }
      }

      if (options.isDraft) {
        // Save as draft
        const saveButton = await this.page.locator('button:has-text("Save draft"), [data-testid="save-draft"]').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
        }
        return { success: true };
      } else {
        // Publish the article
        const finalPublishButton = await this.page.locator('button:has-text("Publish now"), [data-testid="publish-now"]').first();
        if (await finalPublishButton.isVisible()) {
          await finalPublishButton.click();
          
          // Wait for success and get URL
          await this.page.waitForLoadState('networkidle');
          const currentUrl = this.page.url();
          
          return { success: true, url: currentUrl };
        }
      }

      return { success: false, error: 'Could not find publish button' };

    } catch (error) {
      return { success: false, error: `Publishing failed: ${error}` };
    }
  }

  async searchMediumArticles(keywords: string[]): Promise<MediumArticle[]> {
    if (!this.page) throw new Error('Browser not initialized');

    const searchQuery = keywords.join(' ');
    logger.info(`🔍 Searching Medium for: "${searchQuery}"`);

    // Try to use saved session if available (but don't force login for search)
    if (existsSync(this.sessionPath)) {
      logger.debug('💾 Using saved session for search...');
    }

    await this.page.goto(`https://medium.com/search?q=${encodeURIComponent(searchQuery)}`);
    await this.page.waitForLoadState('networkidle');

    // Wait a bit more for dynamic content to load
    await this.page.waitForTimeout(BrowserMediumClient.TIMEOUTS.SHORT_WAIT);

    logger.debug('📄 Current page URL:', this.page.url());

    const articles = await this.page.evaluate((searchQuery) => {
      // Remove console.log from browser context to avoid JSON interference
      const log = (...args: any[]) => {
        // Silent in browser context
      };
      
      log('🔎 Starting search extraction for:', searchQuery);
      
      // Try multiple selectors for different Medium layouts
      const possibleSelectors = [
        // Modern Medium selectors
        'article',
        '[data-testid="story-preview"]',
        '[data-testid="story-card"]',
        '.js-postListItem',
        '.postArticle',
        '.streamItem',
        '.js-streamItem',
        // Fallback selectors
        'div[role="article"]',
        '.story-preview',
        '.post-preview'
      ];

      // Define article structure for browser context
      const articles: Array<{
        title: string;
        content: string;
        url: string;
        publishDate: string;
        tags: string[];
        claps: number;
      }> = [];
      let elementsFound = 0;

      for (const selector of possibleSelectors) {
        const elements = document.querySelectorAll(selector);
        log(`🎯 Selector "${selector}" found ${elements.length} elements`);
        
        if (elements.length > 0) {
          elementsFound += elements.length;
          
          elements.forEach((element, index) => {
            try {
              // Try multiple title selectors
              const titleSelectors = [
                'h1', 'h2', 'h3', 'h4',
                '[data-testid="story-title"]',
                '.graf--title',
                '.story-title',
                '.post-title',
                'a[data-action="show-post"]'
              ];

              let titleElement = null;
              let titleText = '';

              for (const titleSel of titleSelectors) {
                titleElement = element.querySelector(titleSel);
                if (titleElement && titleElement.textContent?.trim()) {
                  titleText = titleElement.textContent.trim();
                  break;
                }
              }

              // Try multiple approaches to find the actual article URL
              let linkUrl = '';
              
              // Strategy 1: Look for data-href attribute (most reliable for articles)
              const dataHrefElement = element.querySelector('[data-href]');
              if (dataHrefElement) {
                const dataHref = dataHrefElement.getAttribute('data-href');
                if (dataHref && dataHref.includes('medium.com') && dataHref.includes('-')) {
                  linkUrl = dataHref;
                }
              }
              
              // Strategy 2: Look for direct article links if data-href didn't work
              if (!linkUrl) {
                const linkSelectors = [
                  'a[href*="medium.com"][href*="-"]', // Article URLs usually have dashes
                  'a[href*="/@"][href*="-"]',         // Author articles with dashes
                  'a[href*="medium.com"]',
                  'a[href*="/"]',
                  'a'
                ];

                                  for (const linkSel of linkSelectors) {
                    const linkElement = element.querySelector(linkSel);
                    if (linkElement && (linkElement as HTMLAnchorElement).href) {
                      let href = (linkElement as HTMLAnchorElement).href;
                      
                      // Clean up and validate the URL
                      if (href) {
                        // If it's a redirect URL, extract the actual article URL
                        if (href.includes('redirect=')) {
                          const redirectMatch = href.match(/redirect=([^&]+)/);
                          if (redirectMatch) {
                            href = decodeURIComponent(redirectMatch[1]);
                          }
                        }
                        
                        // Check if it's a valid article URL (prioritize actual articles)
                        const isValidArticleUrl = (
                          href.includes('medium.com') && 
                          !href.includes('/search?') &&  // Don't include search pages themselves
                          !href.includes('/signin') &&
                          !href.includes('/bookmark') &&
                          !href.includes('/signup') &&
                          // Prioritize URLs that look like actual articles
                          (href.includes('-') ||  // Article slugs usually have dashes
                           href.includes('/@') || 
                           href.match(/\/[a-f0-9]{8,}/))  // Article IDs (8+ chars)
                        );
                        
                        if (isValidArticleUrl) {
                          // Clean the URL but preserve the path
                          if (href.includes('?')) {
                            // Extract the actual article URL from redirect parameters
                            if (href.includes('redirect=')) {
                              const redirectMatch = href.match(/redirect=([^&]+)/);
                              if (redirectMatch) {
                                linkUrl = decodeURIComponent(redirectMatch[1]);
                              }
                            } else {
                              // Just remove query parameters for cleaner URLs
                              linkUrl = href.split('?')[0];
                            }
                          } else {
                            linkUrl = href;
                          }
                          break;
                        }
                      }
                    }
                  }
                }

              // Try to get author info
              const authorSelectors = [
                '[data-testid="story-author"]',
                '.postMetaInline-authorLockup',
                '.story-author',
                '.author-name'
              ];

              let authorText = '';
              for (const authorSel of authorSelectors) {
                const authorElement = element.querySelector(authorSel);
                if (authorElement && authorElement.textContent?.trim()) {
                  authorText = authorElement.textContent.trim();
                  break;
                }
              }

              // Try to get snippet/preview
              const snippetSelectors = [
                '.story-excerpt',
                '.post-excerpt',
                '.graf--p',
                'p'
              ];

              let snippetText = '';
              for (const snippetSel of snippetSelectors) {
                const snippetElement = element.querySelector(snippetSel);
                if (snippetElement && snippetElement.textContent?.trim()) {
                  snippetText = snippetElement.textContent.trim().substring(0, 200);
                  break;
                }
              }

              log(`📝 Article ${index + 1}:`, {
                title: titleText,
                url: linkUrl,
                author: authorText,
                snippet: snippetText.substring(0, 50) + '...'
              });

              if (titleText && linkUrl) {
                articles.push({
                  title: titleText,
                  content: snippetText,
                  url: linkUrl,
                  publishDate: '',
                  tags: [],
                  claps: 0
                });
              }
            } catch (error) {
              log('❌ Error extracting article:', error);
            }
          });

          // If we found articles with this selector, we can break
          if (articles.length > 0) {
            log(`✅ Successfully extracted ${articles.length} articles using selector: ${selector}`);
            break;
          }
        }
      }

      log(`📊 Total elements found: ${elementsFound}, Articles extracted: ${articles.length}`);
      
      // If no articles found, let's debug what's on the page
      if (articles.length === 0) {
        log('🔍 Debug: Page structure analysis');
        log('Page title:', document.title);
        log('Page text content preview:', document.body.textContent?.substring(0, 500));
        
        // Look for any text that might indicate search results
        const searchResultIndicators = [
          'No stories found',
          'No results',
          'Try different keywords',
          'stories found',
          'results for'
        ];
        
        const pageText = document.body.textContent?.toLowerCase() || '';
        for (const indicator of searchResultIndicators) {
          if (pageText.includes(indicator.toLowerCase())) {
            log(`📍 Found indicator: "${indicator}"`);
          }
        }
      }

      return articles;
    }, searchQuery);

    logger.info(`🎉 Search completed. Found ${articles.length} articles`);
    return articles;
  }

  /**
   * Validate a storage state object by checking if cookies are expired.
   * @param storageState - The storage state object from Playwright
   * @returns true if the storage state is valid and not expired
   */
  private validateStorageState(storageState: StorageState): boolean {
    if (!storageState || !storageState.cookies) {
      return false;
    }

    const now = Date.now() / 1000; // Unix timestamp in seconds

    // Check if any critical authentication cookies are expired
    // Only check CRITICAL auth cookies, not analytics/tracking cookies
    for (const cookie of storageState.cookies) {
      // Only check CRITICAL Medium authentication cookies
      // Ignore analytics cookies (_ga, _gat, _gid), CloudFlare cookies, etc.
      const isCriticalAuthCookie =
        (cookie.name.includes('sid') && cookie.domain.includes('medium.com')) ||
        (cookie.name.includes('uid') && cookie.domain.includes('medium.com')) ||
        (cookie.name.toLowerCase().includes('session') && cookie.domain.includes('medium.com'));

      if (isCriticalAuthCookie && cookie.expires) {
        // Skip session cookies (expires: -1 or 0 means no expiry)
        if (cookie.expires <= 0) {
          continue;
        }

        // Check if cookie is expired
        if (cookie.expires < now) {
          logger.warn(`❌ Critical auth cookie expired: ${cookie.name} (expired ${new Date(cookie.expires * 1000).toISOString()})`);
          return false;
        }
      }
    }

    logger.info('✅ All authentication cookies are valid');
    return true;
  }

  /**
   * Get the earliest cookie expiry timestamp from a storage state.
   * @param storageState - The storage state object from Playwright
   * @returns The earliest expiry timestamp in Unix seconds, or null if no cookies
   */
  private getEarliestCookieExpiry(storageState: StorageState): number | null {
    if (!storageState?.cookies) return null;

    let earliest: number | null = null;
    for (const cookie of storageState.cookies) {
      if (cookie.expires && (!earliest || cookie.expires < earliest)) {
        earliest = cookie.expires;
      }
    }
    return earliest;
  }

  /**
   * Determine if the browser should run in headless mode.
   * Uses headless mode if we have a valid authenticated session.
   * @returns true if headless mode should be used, false if browser should be visible
   */
  private shouldUseHeadlessMode(): boolean {
    // If we have a validated session, we can use headless mode
    // Otherwise, keep visible for initial login
    return this.isAuthenticatedSession;
  }

  /**
   * Fast session validation using HTTP redirect check.
   * Much faster than DOM selector-based validation (5s vs 21s).
   * @returns true if session is valid, false otherwise
   */
  async validateSessionFast(): Promise<boolean> {
    if (!this.page) {
      logger.warn('⚠️  Cannot validate session: browser not initialized');
      return false;
    }

    try {
      logger.debug('🔍 Validating session...');

      // Navigate to lightweight Medium endpoint
      const response = await this.page.goto('https://medium.com/me', {
        waitUntil: 'domcontentloaded', // Faster than networkidle
        timeout: 10000
      });

      // Check if redirected to login page
      const currentUrl = this.page.url();
      if (currentUrl.includes('/m/signin') || currentUrl.includes('login')) {
        logger.warn('❌ Session invalid: redirected to login page');
        return false;
      }

      // Check response status
      if (response && (response.status() === 401 || response.status() === 403)) {
        logger.warn('❌ Session invalid: received auth error status');
        return false;
      }

      logger.info('✅ Session validated successfully (fast check)');
      return true;
    } catch (error) {
      logger.warn('⚠️  Session validation failed:', error);
      return false;
    }
  }

  /**
   * Pre-validate session file without launching browser.
   * Checks if session file exists and cookies are not expired.
   * @returns true if session file is valid, false otherwise
   */
  async preValidateSession(): Promise<boolean> {
    if (!existsSync(this.sessionPath)) {
      logger.warn('❌ No session file found');
      return false;
    }

    try {
      const sessionData = JSON.parse(readFileSync(this.sessionPath, 'utf8'));
      return this.validateStorageState(sessionData);
    } catch (error) {
      logger.error('❌ Session file corrupted:', error);
      return false;
    }
  }

  /**
   * Extract article metadata from article cards on the current page.
   * Shared logic used by getFeed() and getListArticles().
   *
   * @param maxArticles - Maximum number of articles to extract
   * @param feedCategory - Optional feed category to tag articles (for 'all' category)
   * @returns Array of article metadata
   */
  private async extractArticleCards(
    maxArticles: number,
    feedCategory?: FeedCategory
  ): Promise<MediumFeedArticle[]> {
    if (!this.page) {
      throw new Error('Browser not initialized');
    }

    return await this.page.evaluate(
      ({ limit, category }) => {
        // Define feed article structure for browser context
        const feedArticles: Array<{
          title: string;
          excerpt: string;
          url: string;
          author?: string;
          publishDate?: string;
          readTime?: string;
          claps?: number;
          imageUrl?: string;
          feedCategory?: 'featured' | 'for-you' | 'following' | 'all';
        }> = [];

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

        // Find which selector returns the most elements
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
        cardElements.forEach((card, index) => {
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
                  const href = (titleLink as HTMLAnchorElement).href;
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
                .map(link => (link as HTMLAnchorElement).href)
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
            // Note: Using literal numbers here because BrowserMediumClient constants aren't accessible in page.evaluate()
            let claps = 0;
            const clapMatch = dateText.match(/(\d+(?:K|M)?)\s+claps?/i);
            if (clapMatch) {
              const clapStr = clapMatch[1];
              if (clapStr.includes('K')) {
                claps = parseFloat(clapStr) * 1000;  // 1K multiplier
              } else if (clapStr.includes('M')) {
                claps = parseFloat(clapStr) * 1000000;  // 1M multiplier
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

            const article: {
              title: string;
              excerpt: string;
              url: string;
              author?: string;
              publishDate?: string;
              readTime?: string;
              claps?: number;
              imageUrl?: string;
              feedCategory?: 'featured' | 'for-you' | 'following' | 'all';
            } = {
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
            if (category) {
              article.feedCategory = category;
            }

            feedArticles.push(article);
          } catch (error) {
            // Silent error in browser context
            const noop = () => {};
            noop();
          }
        });

        return feedArticles;
      },
      { limit: maxArticles, category: feedCategory }
    );
  }

  /**
   * Retrieve article headers from a Medium feed.
   * @param category - Feed category: 'featured', 'for-you', or 'following'
   * @param limit - Maximum number of articles to return (default: 10)
   * @returns Array of feed articles with title, excerpt, and metadata
   */
  async getFeed(category: FeedCategory, limit: number = 10): Promise<MediumFeedArticle[]> {
    if (!this.page) throw new Error('Browser not initialized');

    logger.info(`📰 Fetching ${category} feed (limit: ${limit})...`);

    // Handle 'all' category by fetching from all feeds
    if (category === 'all') {
      logger.info('  📚 Fetching from all feeds...');
      const categories: Array<'featured' | 'for-you' | 'following'> = ['featured', 'for-you', 'following'];
      const allArticles: MediumFeedArticle[] = [];

      for (const cat of categories) {
        try {
          logger.debug(`  📰 Fetching ${cat} feed...`);
          const articles = await this.getFeed(cat, limit);
          // Tag each article with its source feed
          articles.forEach(article => article.feedCategory = cat);
          allArticles.push(...articles);
          logger.debug(`  ✅ Got ${articles.length} article(s) from ${cat}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          logger.warn(`  ⚠️  Failed to fetch ${cat} feed: ${message}`);
          // Continue with other feeds even if one fails
        }
      }

      logger.info(`  ✅ Total: ${allArticles.length} article(s) from all feeds`);
      return allArticles;
    }

    // Determine navigation URL based on category
    let feedUrl: string;
    let needsTabClick = false;
    let tabSelector = '';

    switch (category) {
      case 'featured':
        feedUrl = 'https://medium.com/';
        needsTabClick = true;
        tabSelector = 'button:has-text("Featured"), a:has-text("Featured")';
        break;
      case 'for-you':
        feedUrl = 'https://medium.com/';
        needsTabClick = true;
        tabSelector = 'button:has-text("For you"), a:has-text("For you")';
        break;
      case 'following':
        feedUrl = 'https://medium.com/me/following-feed/all';
        needsTabClick = false;
        break;
      default:
        throw new Error(`Invalid feed category: ${category}`);
    }

    // Navigate to feed page
    await this.page.goto(feedUrl, {
      waitUntil: 'domcontentloaded',
      timeout: BrowserMediumClient.TIMEOUTS.PAGE_LOAD
    });
    await this.page.waitForTimeout(BrowserMediumClient.TIMEOUTS.SHORT_WAIT);

    // Click tab if needed (Featured/For You on homepage)
    if (needsTabClick) {
      try {
        logger.debug(`  🔍 Clicking ${category} tab...`);
        const tab = this.page.locator(tabSelector).first();
        await tab.click();
        await this.page.waitForLoadState('networkidle', { timeout: BrowserMediumClient.TIMEOUTS.NETWORK_IDLE }).catch(() => {
          logger.warn('  ⚠️  Network idle timeout, continuing...');
        });
        await this.page.waitForTimeout(1500);
      } catch (error) {
        logger.warn(`  ⚠️  Failed to click tab, proceeding with default view: ${error}`);
      }
    }

    // Extract article cards from feed using shared method
    const articles = await this.extractArticleCards(limit);

    logger.debug(`  ✅ Extracted ${articles.length} article(s) from ${category} feed`);
    return articles;
  }

  /**
   * Retrieve user's saved reading lists.
   * @returns Array of reading lists with metadata
   */
  async getLists(): Promise<MediumList[]> {
    if (!this.page) throw new Error('Browser not initialized');

    await this.ensureLoggedIn(); // Lists require authentication

    logger.info('📚 Fetching user reading lists...');

    // Navigate to lists page
    await this.page.goto('https://medium.com/me/lists', {
      waitUntil: 'domcontentloaded',
      timeout: BrowserMediumClient.TIMEOUTS.PAGE_LOAD
    });
    await this.page.waitForTimeout(BrowserMediumClient.TIMEOUTS.SHORT_WAIT);

    // Extract lists from page
    const lists = await this.page.evaluate(() => {
      // Define list structure for browser context
      const mediumLists: Array<{
        id: string;
        name: string;
        description?: string;
        articleCount?: number;
        url: string;
      }> = [];

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
          console.error(`  Found ${elements.length} elements with selector: ${selector}`);
          break;
        }
      }

      if (!listElements || listElements.length === 0) {
        console.error('  No list elements found with any selector');
        return [];
      }

      // Track seen list IDs to avoid duplicates
      const seenIds = new Set<string>();

      listElements.forEach((listEl, index) => {
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
            console.error(`  List ${index}: No name found, skipping`);
            return; // Skip if no name
          }

          // Extract list URL and ID from link inside or as the element itself
          let listUrl = '';
          let listId = '';

          // Check if the element itself is a link
          if ((listEl as HTMLAnchorElement).href?.includes('/list/')) {
            listUrl = (listEl as HTMLAnchorElement).href.split('?')[0];
          } else {
            // Look for link inside the container
            const linkEl = listEl.querySelector('a[href*="/list/"]');
            if (linkEl && (linkEl as HTMLAnchorElement).href) {
              listUrl = (linkEl as HTMLAnchorElement).href.split('?')[0];
            }
          }

          if (!listUrl) {
            console.error(`  List "${name}": No URL found, skipping`);
            return;
          }

          // Extract list ID from URL
          const idMatch = listUrl.match(/\/list\/([^?/]+)/);
          if (idMatch) {
            listId = idMatch[1];
          }

          if (!listId || seenIds.has(listId)) {
            console.error(`  List "${name}": Duplicate or no ID, skipping`);
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
          console.error('Error extracting list:', error);
        }
      });

      return mediumLists;
    });

    logger.info(`  ✅ Found ${lists.length} reading list(s)`);
    return lists;
  }

  /**
   * Retrieve article headers from a specific reading list.
   * @param listId - The list ID to fetch articles from
   * @param limit - Maximum number of articles to return (default: 10)
   * @returns Array of feed articles from the list
   */
  async getListArticles(listId: string, limit: number = 10): Promise<MediumFeedArticle[]> {
    if (!this.page) throw new Error('Browser not initialized');

    await this.ensureLoggedIn(); // Lists require authentication

    logger.info(`📋 Fetching articles from list ${listId} (limit: ${limit})...`);

    // First, navigate to /me/lists to find the full URL for this list
    // (List URLs require username: /@username/list/list-id, not /me/list/list-id)
    await this.page.goto('https://medium.com/me/lists', {
      waitUntil: 'domcontentloaded',
      timeout: BrowserMediumClient.TIMEOUTS.PAGE_LOAD
    });
    await this.page.waitForTimeout(BrowserMediumClient.TIMEOUTS.SHORT_WAIT);

    // Find the list URL from the lists page
    const listUrl = await this.page.evaluate((targetListId: string) => {
      const allLinks = Array.from(document.querySelectorAll('a[href*="/list/"]'));
      for (const link of allLinks) {
        const href = (link as HTMLAnchorElement).href;
        // Check if this link matches our list ID
        const idMatch = href.match(/\/list\/([^?\/]+)/);
        if (idMatch && idMatch[1] === targetListId) {
          return href.split('?')[0]; // Return URL without query params
        }
      }
      return null;
    }, listId);

    if (!listUrl) {
      throw new Error(`List not found: ${listId}`);
    }

    logger.debug(`  Found list URL: ${listUrl}`);

    // Navigate to the list page using the full URL
    await this.page.goto(listUrl, {
      waitUntil: 'domcontentloaded',
      timeout: BrowserMediumClient.TIMEOUTS.PAGE_LOAD
    });
    await this.page.waitForTimeout(BrowserMediumClient.TIMEOUTS.SHORT_WAIT);

    // Check if list exists (detect error page)
    const isErrorPage = await this.page.evaluate(() => {
      const pageText = document.body.textContent?.toLowerCase() || '';
      return pageText.includes('not found') ||
             pageText.includes('doesn\'t exist') ||
             document.title.includes('404');
    });

    if (isErrorPage) {
      throw new Error(`List not found: ${listId}`);
    }

    // Extract articles from list using shared method
    const articles = await this.extractArticleCards(limit);

    logger.debug(`  ✅ Extracted ${articles.length} article(s) from list`);
    return articles;
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      // Reset authentication state when browser closes
      // This ensures fresh validation on next initialize()
      this.isAuthenticatedSession = false;
    }
  }
} 