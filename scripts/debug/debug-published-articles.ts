import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

async function debugPublishedArticles() {
  console.log('🔍 Specifically checking Published articles tab...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 300,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const sessionPath = join(__dirname, '..', 'medium-session.json');
  let contextOptions: any = {
    viewport: { width: 1280, height: 1080 }, // Taller viewport
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  if (existsSync(sessionPath)) {
    const sessionData = JSON.parse(readFileSync(sessionPath, 'utf-8'));
    contextOptions.storageState = sessionData;
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  // Try different approaches to get published articles
  const approaches = [
    {
      name: 'Direct URL with query param',
      action: async () => {
        await page.goto('https://medium.com/me/stories?tab=posts-published', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
      }
    },
    {
      name: 'Direct URL /public',
      action: async () => {
        await page.goto('https://medium.com/me/stories/public', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
      }
    },
    {
      name: 'Navigate then click Published tab',
      action: async () => {
        await page.goto('https://medium.com/me/stories', {
          waitUntil: 'domcontentloaded',
          timeout: 15000
        });
        await page.waitForTimeout(2000);

        // Click Published tab
        const publishedTab = page.locator('button:has-text("Published"), a:has-text("Published")').first();
        if (await publishedTab.isVisible()) {
          await publishedTab.click();
        }
      }
    }
  ];

  for (const approach of approaches) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`🔍 Approach: ${approach.name}`);
    console.log('='.repeat(80));

    try {
      await approach.action();

      // Wait for content
      console.log('⏳ Waiting for content to load...');
      await page.waitForTimeout(5000);

      // Scroll down to trigger lazy loading
      console.log('📜 Scrolling to load more content...');
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(2000);
      await page.evaluate(() => window.scrollTo(0, 0)); // Back to top

      // Check current state
      const currentUrl = page.url();
      console.log(`   URL: ${currentUrl}`);

      // Extract all articles
      const articles = await page.evaluate(() => {
        const articles: any[] = [];
        const rows = document.querySelectorAll('table tbody tr');

        console.log(`Found ${rows.length} table rows`);

        rows.forEach((row, index) => {
          const h2 = row.querySelector('h2');
          const editLink = row.querySelector<HTMLAnchorElement>('a[href*="/p/"][href*="/edit"]');

          if (h2 && editLink) {
            const match = editLink.href.match(/\/p\/([a-f0-9]+)\//);
            const articleId = match ? match[1] : null;

            // Get all text from the row
            const rowText = row.textContent || '';

            // Try to find publication info
            const publicationCell = row.querySelector('td:nth-child(2)');
            const statusCell = row.querySelector('td:nth-child(3)');

            articles.push({
              index,
              id: articleId,
              title: h2.textContent?.trim(),
              publication: publicationCell?.textContent?.trim() || '',
              status: statusCell?.textContent?.trim() || '',
              rowSnippet: rowText.substring(0, 200)
            });
          }
        });

        return articles;
      });

      console.log(`   Found ${articles.length} article(s):\n`);
      articles.forEach((article: any) => {
        console.log(`   📄 "${article.title}"`);
        console.log(`      ID: ${article.id}`);
        console.log(`      Publication: "${article.publication}"`);
        console.log(`      Status: "${article.status}"`);
        console.log(`      Row text: ${article.rowSnippet}`);
        console.log('');
      });

      if (articles.length === 0) {
        console.log('   ❌ No articles found with this approach');

        // Take screenshot for debugging
        const screenshotPath = join(__dirname, '..', '..', '.debug', 'screenshots', `debug-published-${approach.name.replace(/\s+/g, '-')}.png`);
        await page.screenshot({ path: screenshotPath, fullPage: true });
        console.log(`   📸 Screenshot saved: ${screenshotPath}`);
      }

    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('💡 NEXT STEPS');
  console.log('='.repeat(80));
  console.log('Please check the browser window manually:');
  console.log('1. Navigate to different tabs (Drafts, Published, Unlisted)');
  console.log('2. Count how many articles you see in each tab');
  console.log('3. Check if articles appear after waiting/scrolling');
  console.log('\nBrowser will stay open for 2 minutes for manual inspection...');

  await new Promise(resolve => setTimeout(resolve, 120000));
  await browser.close();
}

debugPublishedArticles().catch(console.error);
