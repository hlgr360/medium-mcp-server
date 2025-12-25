import { chromium, Browser, Page, BrowserContext } from 'playwright';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';

export interface MediumArticle {
  title: string;
  content: string;
  url?: string;
  publishDate?: string;
  tags?: string[];
  claps?: number;
}

export interface PublishOptions {
  title: string;
  content: string;
  tags?: string[];
  isDraft?: boolean;
}

export class BrowserMediumClient {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;
  private sessionPath = join(process.cwd(), 'medium-session.json');
  private isAuthenticatedSession: boolean = false;

  /**
   * Initialize the browser for automation.
   * @param forceHeadless - Optional parameter to force headless mode. If not provided, uses shouldUseHeadlessMode().
   */
  async initialize(forceHeadless?: boolean): Promise<void> {
    const headlessMode = forceHeadless ?? this.shouldUseHeadlessMode();

    this.browser = await chromium.launch({
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

    // Load existing session if available
    const contextOptions: any = {
      viewport: { width: 1280, height: 720 },
      userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      extraHTTPHeaders: {
        'Accept-Language': 'en-US,en;q=0.9'
      }
    };

    // Load and validate existing session if available
    if (existsSync(this.sessionPath)) {
      try {
        const sessionData = JSON.parse(readFileSync(this.sessionPath, 'utf8'));

        // Validate session before loading (check cookie expiry)
        if (this.validateStorageState(sessionData)) {
          contextOptions.storageState = sessionData;
          this.isAuthenticatedSession = true;
          console.error('✅ Loaded valid session from file');
        } else {
          console.error('⚠️  Session file has expired cookies, will re-authenticate');
          this.isAuthenticatedSession = false;
        }
      } catch (error) {
        console.error('❌ Failed to load session:', error);
        this.isAuthenticatedSession = false;
      }
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

  async ensureLoggedIn(): Promise<boolean> {
    if (!this.page) throw new Error('Browser not initialized');

    // Check if we have a saved session
    const hasSession = existsSync(this.sessionPath);

    if (hasSession) {
      console.error('💾 Found existing session file, checking if still valid...');
    } else {
      console.error('🔐 No session file found, need to login');
    }

    // Smart approach: Navigate to /m/signin regardless of session status
    // If already logged in, Medium will auto-redirect to homepage
    // If not logged in, we stay on /m/signin (ready for login)
    console.error('🌐 Navigating to login page to check session...');
    await this.page.goto('https://medium.com/m/signin');
    await this.page.waitForLoadState('networkidle');

    // Check if we got redirected (means we're already logged in)
    const currentUrl = this.page.url();
    if (!currentUrl.includes('/m/signin')) {
      // We got redirected away from login page - we're logged in!
      console.error(`✅ Already logged in (redirected to ${currentUrl})`);
      await this.saveSession();
      return true;
    }

    // Still on login page - need to login
    console.error('⏳ On login page, waiting for authentication...');

    // Check if browser is in headless mode - if so, we need to restart in visible mode
    const isHeadless = this.browser?.contexts()[0]?.browser()?.isConnected();
    if (this.isAuthenticatedSession && this.browser) {
      // We're in headless mode but need user login - restart browser in visible mode
      console.error('⚠️  Browser in headless mode but login required - restarting in visible mode...');
      await this.close();
      await this.initialize(false); // Force non-headless
      await this.page!.goto('https://medium.com/m/signin');
      await this.page!.waitForLoadState('networkidle');
    }

    // Wait for user to complete login
    console.error('⏳ Waiting for you to complete login in the browser...');
    console.error('');
    console.error('🔐 LOGIN INSTRUCTIONS:');
    console.error('   1. In the opened browser, choose "Sign in with email"');
    console.error('   2. Use your Medium email/password (avoid Google login if possible)');
    console.error('   3. If you must use Google login:');
    console.error('      - Try clicking "Sign in with Google"');
    console.error('      - If blocked, manually navigate to medium.com in a regular browser');
    console.error('      - Login there first, then come back to this automated browser');
    console.error('   4. Complete any 2FA if prompted');
    console.error('   5. The script will continue automatically once logged in...');
    console.error('');

    // Wait for successful login (user button appears)
    try {
      await this.page.waitForSelector('[data-testid="headerUserIcon"], [data-testid="headerWriteButton"], button[aria-label*="user"]', { timeout: 300000 }); // 5 minutes
      console.error('✅ Login successful!');
      await this.saveSession();
      return true;
    } catch (error) {
      console.error('❌ Login timeout. Please try again.');
      return false;
    }
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

      writeFileSync(this.sessionPath, JSON.stringify(sessionData, null, 2));
      this.isAuthenticatedSession = true;

      console.error('💾 Session saved for future use');

      // Debug logging: show cookie expiry information
      const earliestExpiry = this.getEarliestCookieExpiry(sessionData);
      if (earliestExpiry) {
        const expiryDate = new Date(earliestExpiry * 1000);
        console.error(`📅 Session valid until: ${expiryDate.toISOString()}`);
      }

      const cookieCount = sessionData.cookies?.length || 0;
      const originsCount = sessionData.origins?.length || 0;
      console.error(`📊 Saved ${cookieCount} cookies and ${originsCount} localStorage origins`);

    } catch (error) {
      console.error('❌ Failed to save session:', error);
      this.isAuthenticatedSession = false;
    }
  }

  async getUserArticles(): Promise<MediumArticle[]> {
    if (!this.page) throw new Error('Browser not initialized');
    
    await this.ensureLoggedIn();
    
    // Navigate to user's stories
    await this.page.goto('https://medium.com/me/stories/public');
    await this.page.waitForLoadState('networkidle');

    // Extract article information
    const articles = await this.page.evaluate(() => {
      const articleElements = document.querySelectorAll('[data-testid="story-preview"]');
      const articles: MediumArticle[] = [];

      articleElements.forEach(element => {
        try {
          const titleElement = element.querySelector('h3, h2, [data-testid="story-title"]');
          const linkElement = element.querySelector('a[href*="/"]');
          const dateElement = element.querySelector('[data-testid="story-publish-date"], time');
          
          if (titleElement && linkElement) {
            articles.push({
              title: titleElement.textContent?.trim() || '',
              content: '', // We'll need to fetch full content separately
              url: (linkElement as HTMLAnchorElement).href,
              publishDate: dateElement?.textContent?.trim() || '',
              tags: []
            });
          }
        } catch (error) {
          console.error('Error extracting article:', error);
        }
      });

      return articles;
    });

    return articles;
  }

  async getArticleContent(url: string, requireLogin: boolean = true): Promise<string> {
    if (!this.page) throw new Error('Browser not initialized');
    
    console.error(`📖 Fetching article content from: ${url}`);
    
    // Check if we have a saved session first
    let isLoggedIn = false;
    if (existsSync(this.sessionPath)) {
      console.error('💾 Found saved session, checking if still valid...');
      
      // Quick check: try to access Medium homepage and look for login indicators
      try {
        await this.page.goto('https://medium.com');
        await this.page.waitForLoadState('networkidle');
        
        // Try to find login indicators quickly
        const loginIndicators = [
          '[data-testid="headerUserIcon"]',
          '[data-testid="headerWriteButton"]',
          '[data-testid="headerNotificationButton"]',
          'button[aria-label*="user"]'
        ];
        
        for (const selector of loginIndicators) {
          try {
            await this.page.waitForSelector(selector, { timeout: 2000 });
            console.error('✅ Session is still valid, user is logged in');
            isLoggedIn = true;
            break;
          } catch {
            // Try next selector
          }
        }
      } catch (error) {
        console.error('⚠️  Could not verify session validity');
      }
    }
    
    if (!isLoggedIn && requireLogin) {
      console.error('🔐 Not logged in. Attempting login for full content access...');
      isLoggedIn = await this.ensureLoggedIn();
    } else if (!isLoggedIn && !requireLogin) {
      console.error('🔓 Skipping login as requested. Will get preview content only.');
    }
    
    if (!isLoggedIn) {
      console.error('⚠️  Warning: Login failed or skipped. You may only get partial content (preview).');
    } else {
      console.error('✅ Ready to fetch full article content with login session');
    }
    
    try {
      console.error(`🌐 Navigating to article: ${url}`);
      await this.page.goto(url, { waitUntil: 'networkidle' });
      
      // Wait a bit more for dynamic content
      await this.page.waitForTimeout(3000);
      
      console.error('📄 Page loaded, extracting content...');

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

      console.error(`✅ Content extraction completed. Length: ${content.length} characters`);
      return content;
      
    } catch (error) {
      console.error('❌ Error fetching article content:', error);
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

      // Wait for the editor to load
      await this.page.waitForSelector('[data-testid="richTextEditor"]', { timeout: 10000 });

      // Add title
      const titleSelector = '[data-testid="richTextEditor"] h1, [placeholder*="Title"], .graf--title';
      await this.page.waitForSelector(titleSelector);
      await this.page.click(titleSelector);
      await this.page.fill(titleSelector, options.title);

      // Add content
      const contentSelector = '[data-testid="richTextEditor"] p, .graf--p';
      await this.page.waitForSelector(contentSelector);
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
    console.error(`🔍 Searching Medium for: "${searchQuery}"`);
    
    // Try to use saved session if available (but don't force login for search)
    if (existsSync(this.sessionPath)) {
      console.error('💾 Using saved session for search...');
    }
    
    await this.page.goto(`https://medium.com/search?q=${encodeURIComponent(searchQuery)}`);
    await this.page.waitForLoadState('networkidle');
    
    // Wait a bit more for dynamic content to load
    await this.page.waitForTimeout(2000);

    console.error('📄 Current page URL:', this.page.url());

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

      const articles: any[] = [];
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

    console.error(`🎉 Search completed. Found ${articles.length} articles`);
    return articles;
  }

  /**
   * Validate a storage state object by checking if cookies are expired.
   * @param storageState - The storage state object from Playwright
   * @returns true if the storage state is valid and not expired
   */
  private validateStorageState(storageState: any): boolean {
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
          console.error(`❌ Critical auth cookie expired: ${cookie.name} (expired ${new Date(cookie.expires * 1000).toISOString()})`);
          return false;
        }
      }
    }

    console.error('✅ All authentication cookies are valid');
    return true;
  }

  /**
   * Get the earliest cookie expiry timestamp from a storage state.
   * @param storageState - The storage state object from Playwright
   * @returns The earliest expiry timestamp in Unix seconds, or null if no cookies
   */
  private getEarliestCookieExpiry(storageState: any): number | null {
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
      console.error('⚠️  Cannot validate session: browser not initialized');
      return false;
    }

    try {
      console.error('🔍 Validating session...');

      // Navigate to lightweight Medium endpoint
      const response = await this.page.goto('https://medium.com/me', {
        waitUntil: 'domcontentloaded', // Faster than networkidle
        timeout: 10000
      });

      // Check if redirected to login page
      const currentUrl = this.page.url();
      if (currentUrl.includes('/m/signin') || currentUrl.includes('login')) {
        console.error('❌ Session invalid: redirected to login page');
        return false;
      }

      // Check response status
      if (response && (response.status() === 401 || response.status() === 403)) {
        console.error('❌ Session invalid: received auth error status');
        return false;
      }

      console.error('✅ Session validated successfully (fast check)');
      return true;
    } catch (error) {
      console.error('⚠️  Session validation failed:', error);
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
      console.error('❌ No session file found');
      return false;
    }

    try {
      const sessionData = JSON.parse(readFileSync(this.sessionPath, 'utf8'));
      return this.validateStorageState(sessionData);
    } catch (error) {
      console.error('❌ Session file corrupted:', error);
      return false;
    }
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