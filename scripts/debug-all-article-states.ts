import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

async function debugAllStates() {
  console.log('🔍 Investigating all article states and tabs...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 100,
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

  // Try different story URLs
  const storyPages = [
    { name: 'Main Stories Page', url: 'https://medium.com/me/stories' },
    { name: 'Published', url: 'https://medium.com/me/stories/public' },
    { name: 'Drafts', url: 'https://medium.com/me/stories/drafts' },
    { name: 'Unlisted', url: 'https://medium.com/me/stories/unlisted' },
    { name: 'Responses', url: 'https://medium.com/me/stories/responses' },
    { name: 'Scheduled', url: 'https://medium.com/me/stories/scheduled' }
  ];

  for (const storyPage of storyPages) {
    console.log('\n' + '='.repeat(80));
    console.log(`📄 Testing: ${storyPage.name}`);
    console.log(`🌐 URL: ${storyPage.url}`);
    console.log('='.repeat(80));

    try {
      await page.goto(storyPage.url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000);

      const analysis = await page.evaluate(() => {
        const results: any = {
          tableRows: 0,
          articles: [],
          statusLabels: [],
          tabs: []
        };

        // Count table rows
        const rows = document.querySelectorAll('table tbody tr');
        results.tableRows = rows.length;

        // Extract articles
        rows.forEach((row, index) => {
          const h2 = row.querySelector('h2');
          const editLink = row.querySelector<HTMLAnchorElement>('a[href*="/p/"][href*="/edit"]');

          if (h2 && editLink) {
            const rowText = row.textContent || '';

            // Look for status indicators in the row
            const statusCell = row.querySelector('td:nth-child(3)'); // Status column
            const status = statusCell?.textContent?.trim() || 'unknown';

            results.articles.push({
              title: h2.textContent?.trim(),
              status: status,
              editLink: editLink.href,
              rowText: rowText.substring(0, 200)
            });
          }
        });

        // Find status/tab navigation
        const navLinks = document.querySelectorAll('nav a, [role="tab"], button[role="tab"]');
        navLinks.forEach(link => {
          const text = link.textContent?.trim();
          if (text && text.length > 0 && text.length < 30) {
            results.tabs.push(text);
          }
        });

        // Look for any status indicators/badges
        const statusElements = document.querySelectorAll('[class*="status"], [class*="badge"], .label');
        statusElements.forEach(el => {
          const text = el.textContent?.trim();
          if (text && text.length > 0 && text.length < 50) {
            results.statusLabels.push(text);
          }
        });

        return results;
      });

      console.log(`\n📊 Found ${analysis.tableRows} table rows`);

      if (analysis.articles.length > 0) {
        console.log(`\n📚 Articles found:`);
        analysis.articles.forEach((article: any, i: number) => {
          console.log(`\n  Article ${i + 1}:`);
          console.log(`    Title: ${article.title}`);
          console.log(`    Status: ${article.status}`);
          console.log(`    Edit Link: ${article.editLink}`);
        });
      } else {
        console.log('  ❌ No articles found on this page');
      }

      if (analysis.tabs.length > 0) {
        console.log(`\n🔖 Navigation tabs found: ${analysis.tabs.join(', ')}`);
      }

      if (analysis.statusLabels.length > 0) {
        console.log(`\n🏷️  Status labels: ${[...new Set(analysis.statusLabels)].join(', ')}`);
      }

    } catch (error: any) {
      console.log(`  ❌ Error loading page: ${error.message}`);
    }
  }

  console.log('\n\n' + '='.repeat(80));
  console.log('💡 NEXT STEPS');
  console.log('='.repeat(80));
  console.log('Based on this analysis, we need to:');
  console.log('1. Identify which URLs contain which article types');
  console.log('2. Extract status information from the table');
  console.log('3. Update getUserArticles() to fetch from all relevant pages');
  console.log('4. Add status field to MediumArticle interface');

  console.log('\n⏳ Browser will stay open for 30 seconds for inspection...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  await browser.close();
}

debugAllStates().catch(console.error);
