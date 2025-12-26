import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

async function debugArticles() {
  console.log('🔍 Starting articles page debug session...\n');

  const browser = await chromium.launch({
    headless: false, // Visible browser
    slowMo: 100,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  // Load saved session if available
  const sessionPath = join(__dirname, '..', 'medium-session.json');
  let contextOptions: any = {
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  if (existsSync(sessionPath)) {
    console.log('✅ Found saved session, loading...');
    const sessionData = JSON.parse(readFileSync(sessionPath, 'utf-8'));
    contextOptions.storageState = sessionData;
  } else {
    console.log('⚠️  No saved session found. You may need to log in manually.');
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  // Try multiple article page URLs
  const articlePageUrls = [
    'https://medium.com/me/stories/public',
    'https://medium.com/me/stories',
    'https://medium.com/me/stories/drafts'
  ];

  for (const url of articlePageUrls) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🌐 Navigating to: ${url}`);
    console.log('='.repeat(80));

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000); // Wait for dynamic content

      console.log('✅ Page loaded successfully');
      console.log('URL:', page.url());
      console.log('Title:', await page.title());

      // Take screenshot
      const screenshotPath = join(__dirname, '..', `debug-articles-${url.split('/').pop()}.png`);
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`📸 Screenshot saved: ${screenshotPath}`);

      // Check if logged in
      const loginIndicators = [
        '[data-testid="headerUserIcon"]',
        '[data-testid="headerWriteButton"]',
        'button[aria-label*="user"]'
      ];

      let isLoggedIn = false;
      for (const selector of loginIndicators) {
        const element = await page.$(selector);
        if (element) {
          isLoggedIn = true;
          break;
        }
      }

      if (!isLoggedIn) {
        console.log('❌ Not logged in! Please log in first using the login-to-medium tool.');
        continue;
      }

      console.log('✅ Logged in successfully');

      // Look for article-related selectors
      console.log('\n🔍 Checking common article selectors:');
      const articleSelectors = [
        '[data-testid="story-preview"]',
        '[data-testid="story-card"]',
        '[data-testid="post-preview"]',
        'article',
        '.story',
        '.post',
        '[class*="story"]',
        '[class*="post"]',
        'div[role="article"]',
        'a[href*="/p/"]', // Medium article URLs
        'a[href*="/@"]'   // Author links
      ];

      for (const selector of articleSelectors) {
        const elements = await page.$$(selector);
        console.log(`  ${selector}: ${elements.length > 0 ? `✅ FOUND (${elements.length})` : '❌ NOT FOUND'}`);
      }

      // Dump all elements with data-testid
      console.log('\n🔍 All elements with data-testid on page:');
      const testIdElements = await page.$$eval('[data-testid]', (elements) =>
        elements.map(el => ({
          testId: el.getAttribute('data-testid'),
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim().substring(0, 60),
          href: el.getAttribute('href')
        })).slice(0, 50)
      );
      testIdElements.forEach(el => console.log('  ', JSON.stringify(el)));

      // Find all links that might be article links
      console.log('\n🔍 Links that might be articles (filtering by href pattern):');
      const articleLinks = await page.$$eval('a[href]', (links) =>
        links.map(link => ({
          href: link.getAttribute('href'),
          text: link.textContent?.trim().substring(0, 60),
          testId: link.getAttribute('data-testid'),
          classes: link.className
        }))
        .filter(link =>
          link.href?.includes('/@') ||
          link.href?.includes('/p/') ||
          link.href?.includes('medium.com')
        )
        .slice(0, 20)
      );
      articleLinks.forEach(link => console.log('  ', JSON.stringify(link)));

      // Find article containers by looking for title elements
      console.log('\n🔍 Elements with heading tags (h1, h2, h3) - potential article titles:');
      const headings = await page.$$eval('h1, h2, h3, h4', (headingElements) =>
        headingElements.map(h => ({
          tag: h.tagName.toLowerCase(),
          text: h.textContent?.trim().substring(0, 80),
          testId: h.getAttribute('data-testid'),
          classes: h.className,
          parentTestId: h.parentElement?.getAttribute('data-testid'),
          parentClasses: h.parentElement?.className
        })).slice(0, 20)
      );
      headings.forEach(h => console.log('  ', JSON.stringify(h)));

      // Dump the HTML structure of the main content area
      console.log('\n🔍 Main content area HTML structure (first 3000 chars):');
      const mainHtml = await page.evaluate(() => {
        const main = document.querySelector('main') || document.querySelector('[role="main"]') || document.body;
        return main.innerHTML.substring(0, 3000);
      });
      console.log(mainHtml);

      // Try to find repeating patterns (likely article cards)
      console.log('\n🔍 Searching for repeating element patterns (article cards):');
      const patterns = await page.evaluate(() => {
        const allDivs = Array.from(document.querySelectorAll('div'));
        const classCount: { [key: string]: number } = {};

        allDivs.forEach(div => {
          if (div.className && typeof div.className === 'string') {
            const classes = div.className.split(' ').filter(c => c.length > 5);
            classes.forEach(cls => {
              classCount[cls] = (classCount[cls] || 0) + 1;
            });
          }
        });

        // Return classes that appear multiple times (likely article cards)
        return Object.entries(classCount)
          .filter(([_, count]) => count >= 2 && count <= 20)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 15);
      });

      console.log('Classes appearing 2-20 times (likely article containers):');
      patterns.forEach(([className, count]) => console.log(`  ${className}: ${count} instances`));

    } catch (error) {
      console.log(`❌ Error loading ${url}:`, error);
    }
  }

  console.log('\n✅ Debug complete!');
  console.log('⏳ Browser will stay open for 60 seconds for manual inspection...\n');

  await new Promise(resolve => setTimeout(resolve, 60000));

  await browser.close();
  console.log('🔒 Browser closed');
}

debugArticles().catch(console.error);
