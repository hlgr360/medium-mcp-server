import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

async function debugWaitForTableUpdate() {
  console.log('🔍 Testing with proper wait for table updates...\n');

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
    viewport: { width: 1280, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  };

  if (existsSync(sessionPath)) {
    const sessionData = JSON.parse(readFileSync(sessionPath, 'utf-8'));
    contextOptions.storageState = sessionData;
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  console.log('🌐 Navigating to stories page...');
  await page.goto('https://medium.com/me/stories', {
    waitUntil: 'domcontentloaded',
    timeout: 15000
  });
  await page.waitForTimeout(3000);

  // Function to extract articles
  const extractArticles = async (context: string) => {
    const articles = await page.evaluate(() => {
      const articles: any[] = [];
      const rows = document.querySelectorAll('table tbody tr');

      rows.forEach((row) => {
        const h2 = row.querySelector('h2');
        const editLink = row.querySelector<HTMLAnchorElement>('a[href*="/p/"][href*="/edit"]');

        if (h2 && editLink) {
          const match = editLink.href.match(/\/p\/([a-f0-9]+)\//);
          articles.push({
            id: match ? match[1] : null,
            title: h2.textContent?.trim()
          });
        }
      });

      return articles;
    });

    console.log(`\n${context}:`);
    console.log(`  Found ${articles.length} article(s)`);
    articles.forEach((a: any, i: number) => {
      console.log(`    ${i + 1}. "${a.title}" (${a.id})`);
    });

    return articles;
  };

  // Get initial articles (Drafts - default tab)
  console.log('\n' + '='.repeat(80));
  console.log('📋 INITIAL STATE (should be Drafts)');
  console.log('='.repeat(80));
  const initialArticles = await extractArticles('Initial articles');

  // Now click Published tab and wait properly
  console.log('\n' + '='.repeat(80));
  console.log('📑 CLICKING PUBLISHED TAB');
  console.log('='.repeat(80));

  // Find and click Published tab
  const publishedTab = page.locator('button:has-text("Published"), a:has-text("Published")').first();

  console.log('🖱️  Clicking Published tab...');

  // Wait for URL to change as indicator that navigation happened
  const urlBefore = page.url();
  await publishedTab.click();

  // Wait for URL to change
  await page.waitForURL(/tab=posts-published/, { timeout: 10000 });
  console.log(`✅ URL changed from ${urlBefore} to ${page.url()}`);

  // Wait for network to be idle (important!)
  console.log('⏳ Waiting for network to be idle...');
  await page.waitForLoadState('networkidle', { timeout: 10000 });

  // Additional wait for DOM updates
  console.log('⏳ Waiting for DOM to update...');
  await page.waitForTimeout(2000);

  // Try to wait for table to have content
  try {
    await page.waitForSelector('table tbody tr', { timeout: 5000 });
    console.log('✅ Table rows detected');
  } catch {
    console.log('⚠️  No table rows detected within timeout');
  }

  // Extract articles from Published tab
  const publishedArticles = await extractArticles('Published tab articles');

  // Compare
  console.log('\n' + '='.repeat(80));
  console.log('📊 COMPARISON');
  console.log('='.repeat(80));
  console.log(`Initial (Drafts): ${initialArticles.length} articles`);
  console.log(`Published: ${publishedArticles.length} articles`);

  if (publishedArticles.length === 0) {
    console.log('\n❌ Still not finding published articles!');
    console.log('Taking screenshot for debugging...');
    const screenshotPath = join(__dirname, '..', '..', '.debug', 'screenshots', 'debug-published-after-wait.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log(`📸 Screenshot: ${screenshotPath}`);

    // Dump the HTML to see what's actually there
    const tableHTML = await page.evaluate(() => {
      const table = document.querySelector('table');
      return table ? table.outerHTML.substring(0, 2000) : 'No table found';
    });
    console.log('\n📄 Table HTML:', tableHTML);
  }

  console.log('\n⏳ Browser will stay open for 60 seconds...');
  await new Promise(resolve => setTimeout(resolve, 60000));
  await browser.close();
}

debugWaitForTableUpdate().catch(console.error);
