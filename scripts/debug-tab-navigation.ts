import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

async function debugTabNavigation() {
  console.log('🔍 Testing tab navigation to find all articles...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500, // Slower for observation
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const sessionPath = join(__dirname, '..', 'medium-session.json');
  let contextOptions: any = {
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  if (existsSync(sessionPath)) {
    const sessionData = JSON.parse(readFileSync(sessionPath, 'utf-8'));
    contextOptions.storageState = sessionData;
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  console.log('🌐 Navigating to stories page...');
  await page.goto('https://medium.com/me/stories', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  // Function to extract articles from current view
  const extractArticles = async () => {
    return await page.evaluate(() => {
      const articles: any[] = [];
      const rows = document.querySelectorAll('table tbody tr');

      rows.forEach((row) => {
        const h2 = row.querySelector('h2');
        const editLink = row.querySelector<HTMLAnchorElement>('a[href*="/p/"][href*="/edit"]');
        const statusCell = row.querySelector('td:nth-child(3)'); // Status column

        if (h2 && editLink) {
          const match = editLink.href.match(/\/p\/([a-f0-9]+)\//);
          const articleId = match ? match[1] : null;

          articles.push({
            id: articleId,
            title: h2.textContent?.trim(),
            editUrl: editLink.href,
            status: statusCell?.textContent?.trim() || '',
            rowText: row.textContent?.substring(0, 150)
          });
        }
      });

      return articles;
    });
  };

  // Try clicking on different tabs
  const tabs = [
    { name: 'Drafts', selector: 'button:has-text("Drafts"), a:has-text("Drafts")' },
    { name: 'Published', selector: 'button:has-text("Published"), a:has-text("Published")' },
    { name: 'Unlisted', selector: 'button:has-text("Unlisted"), a:has-text("Unlisted")' },
    { name: 'Scheduled', selector: 'button:has-text("Scheduled"), a:has-text("Scheduled")' }
  ];

  const allArticles: any = {};

  for (const tab of tabs) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`📑 Clicking on tab: ${tab.name}`);
    console.log('='.repeat(80));

    try {
      // Try to click the tab
      const tabElement = await page.locator(tab.selector).first();
      const isVisible = await tabElement.isVisible().catch(() => false);

      if (isVisible) {
        await tabElement.click();
        console.log(`✅ Clicked ${tab.name} tab`);
        await page.waitForTimeout(2000); // Wait for content to load

        // Check URL after click
        console.log(`   Current URL: ${page.url()}`);

        // Extract articles
        const articles = await extractArticles();
        allArticles[tab.name] = articles;

        console.log(`   Found ${articles.length} article(s)`);
        articles.forEach((article: any, i: number) => {
          console.log(`   ${i + 1}. "${article.title}" (ID: ${article.id})`);
          console.log(`      Status: "${article.status}"`);
        });
      } else {
        console.log(`   ⚠️  Tab "${tab.name}" not found or not visible`);
      }
    } catch (error: any) {
      console.log(`   ❌ Error: ${error.message}`);
    }
  }

  // Summary
  console.log(`\n\n${'='.repeat(80)}`);
  console.log('📊 SUMMARY');
  console.log('='.repeat(80));

  const uniqueArticles = new Set();
  Object.entries(allArticles).forEach(([tabName, articles]: [string, any]) => {
    console.log(`\n${tabName}:`);
    articles.forEach((article: any) => {
      console.log(`  - ${article.title} (${article.id})`);
      uniqueArticles.add(article.id);
    });
  });

  console.log(`\nTotal unique articles: ${uniqueArticles.size}`);

  console.log('\n⏳ Browser will stay open for 60 seconds for manual inspection...');
  console.log('   Please check the tabs manually to see if there are more articles!');
  await new Promise(resolve => setTimeout(resolve, 60000));
  await browser.close();
}

debugTabNavigation().catch(console.error);
