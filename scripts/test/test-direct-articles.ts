import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

async function testDirectArticles() {
  console.log('🧪 Direct test - bypassing login check...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled',
      '--disable-features=VizDisplayCompositor',
      '--disable-web-security'
    ]
  });

  const sessionPath = join(__dirname, '..', 'medium-session.json');
  const sessionData = JSON.parse(readFileSync(sessionPath, 'utf-8'));

  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    storageState: sessionData,
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9'
    }
  });

  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  const page = await context.newPage();

  console.log('🌐 Navigating to stories page...');
  await page.goto('https://medium.com/me/stories', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  console.log('⏳ Waiting for content...');
  await page.waitForTimeout(5000); // Give time for JS to load

  console.log('URL:', page.url());
  console.log('Title:', await page.title());

  // Parse tabs
  const tabsWithCounts = await page.evaluate(() => {
    const tabs: Array<{ name: string; count: number; text: string }> = [];
    const tabElements = document.querySelectorAll('button, a');

    tabElements.forEach(el => {
      const text = el.textContent?.trim() || '';
      const match = text.match(/^(Drafts|Published|Unlisted|Scheduled|Submissions?)(\d+)?$/);

      if (match) {
        const tabName = match[1].toLowerCase();
        const count = match[2] ? parseInt(match[2], 10) : 0;
        tabs.push({ name: tabName, count, text });
      }
    });

    return tabs;
  });

  console.log('\n📑 Tabs found:');
  tabsWithCounts.forEach(tab => {
    console.log(`  ${tab.text} (${tab.count} articles)`);
  });

  // Scrape each tab
  const allArticles: any[] = [];

  for (const tab of tabsWithCounts) {
    if (tab.count === 0) continue;

    console.log(`\n🔍 Fetching ${tab.name}...`);

    const tabButton = page.locator(`button:has-text("${tab.text}"), a:has-text("${tab.text}")`).first();
    await tabButton.click();
    await page.waitForTimeout(2000);
    await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});

    const articles = await page.evaluate((status: string) => {
      const articles: any[] = [];
      const rows = document.querySelectorAll('table tbody tr');

      rows.forEach(row => {
        const h2 = row.querySelector('h2');
        if (!h2) return;

        let url = '';
        let link = row.querySelector<HTMLAnchorElement>('a[href*="/p/"][href*="/edit"]');
        if (link) {
          const match = link.href.match(/\/p\/([a-f0-9]+)\//);
          if (match) url = `https://medium.com/p/${match[1]}`;
        } else {
          link = row.querySelector<HTMLAnchorElement>('a[href*="/@"]');
          if (link) url = link.href;
        }

        if (url) {
          articles.push({
            title: h2.textContent?.trim(),
            url,
            status
          });
        }
      });

      return articles;
    }, tab.name);

    console.log(`  Found ${articles.length}:`);
    articles.forEach((a: any) => console.log(`    - ${a.title}`));

    allArticles.push(...articles);
  }

  console.log(`\n✅ Total: ${allArticles.length} articles`);
  console.log('\nGrouped by status:');
  const grouped: any = {};
  allArticles.forEach(a => {
    if (!grouped[a.status]) grouped[a.status] = [];
    grouped[a.status].push(a);
  });
  Object.entries(grouped).forEach(([status, arts]: [string, any]) => {
    console.log(`\n${status.toUpperCase()}: ${arts.length}`);
    arts.forEach((a: any) => console.log(`  - ${a.title}`));
  });

  console.log('\n⏳ Browser staying open for 30s...');
  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
}

testDirectArticles().catch(console.error);
