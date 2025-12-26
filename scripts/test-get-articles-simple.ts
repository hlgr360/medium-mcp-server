import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

async function testSimple() {
  console.log('🧪 Simple test: Navigate to articles page and extract data\n');

  const browser = await chromium.launch({
    headless: false, // Visible for debugging
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
    console.log('✅ Loaded session from file');
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  try {
    console.log('🌐 Navigating to articles page...');
    await page.goto('https://medium.com/me/stories/public', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('⏳ Waiting for content to load...');
    await page.waitForTimeout(3000);

    console.log('📊 Extracting articles...\n');

    // Extract articles using the new method
    const articles = await page.evaluate(() => {
      const articles: any[] = [];
      const tableRows = document.querySelectorAll('table tbody tr');

      console.log(`Found ${tableRows.length} table rows`);

      tableRows.forEach((row, index) => {
        const titleElement = row.querySelector('h2');
        const editLink = row.querySelector<HTMLAnchorElement>('a[href*="/p/"][href*="/edit"]');

        if (titleElement && editLink) {
          const match = editLink.href.match(/\/p\/([a-f0-9]+)\//);
          const articleId = match ? match[1] : null;

          if (articleId) {
            const publicUrl = `https://medium.com/p/${articleId}`;
            const metaText = row.textContent || '';
            const dateMatch = metaText.match(/\d+ min read/);

            articles.push({
              title: titleElement.textContent?.trim() || '',
              url: publicUrl,
              publishDate: dateMatch ? dateMatch[0] : '',
              editUrl: editLink.href
            });

            console.log(`  Article ${index + 1}: "${titleElement.textContent?.trim()}"`);
          }
        }
      });

      return articles;
    });

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📚 RESULTS');
    console.log('═══════════════════════════════════════════════════════════════\n');

    if (articles.length === 0) {
      console.log('❌ No articles found!');
      console.log('   The selectors may need further adjustment.');
    } else {
      articles.forEach((article: any, index: number) => {
        console.log(`Article #${index + 1}:`);
        console.log(`  Title: ${article.title}`);
        console.log(`  Public URL: ${article.url}`);
        console.log(`  Edit URL: ${article.editUrl}`);
        console.log(`  Read Time: ${article.publishDate || 'N/A'}`);
        console.log('');
      });

      console.log(`✅ Success! Found ${articles.length} article(s)\n`);
    }

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    console.log('⏳ Browser will stay open for 30 seconds for inspection...');
    await new Promise(resolve => setTimeout(resolve, 30000));
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

testSimple().catch(console.error);
