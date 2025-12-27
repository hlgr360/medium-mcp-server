import { BrowserMediumClient } from '../src/browser-client';
import { join } from 'path';

async function debugSingleList() {
  console.log('🔍 Debugging single list page...\n');

  const client = new BrowserMediumClient();

  try {
    console.log('🌐 Initializing browser...');
    await client.initialize(false);

    const page = (client as any).page;
    if (!page) throw new Error('Page not initialized');

    console.log('🔐 Ensuring logged in...');
    await (client as any).ensureLoggedIn();

    // Try different list ID formats
    const testListIds = [
      'reading-list',
      'ml-database-dda92cc94fd7',
      'ml-general-5e7d00fa0283'
    ];

    for (const listId of testListIds) {
      console.log(`\n${'='.repeat(70)}`);
      console.log(`Testing list ID: ${listId}`);
      console.log('='.repeat(70));

      // Try /me/list/ URL
      const url1 = `https://medium.com/me/list/${listId}`;
      console.log(`\n🌐 Navigating to: ${url1}`);
      await page.goto(url1, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      console.log(`  Final URL: ${page.url()}`);
      console.log(`  Title: ${await page.title()}`);

      // Check for error indicators
      const pageAnalysis = await page.evaluate(() => {
        const bodyText = document.body.textContent || '';
        return {
          hasNotFound: bodyText.toLowerCase().includes('not found'),
          hasDoesntExist: bodyText.toLowerCase().includes("doesn't exist"),
          is404Title: document.title.includes('404'),
          pageTextPreview: bodyText.substring(0, 300),
          articleElements: document.querySelectorAll('article').length,
          h1Elements: Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 5).map(el => el.textContent?.trim()),
          dataTestIds: Array.from(document.querySelectorAll('[data-testid]')).slice(0, 10).map(el => el.getAttribute('data-testid'))
        };
      });

      console.log(`  Has "not found": ${pageAnalysis.hasNotFound}`);
      console.log(`  Has "doesn't exist": ${pageAnalysis.hasDoesntExist}`);
      console.log(`  Is 404 title: ${pageAnalysis.is404Title}`);
      console.log(`  Article elements found: ${pageAnalysis.articleElements}`);
      console.log(`  Headings:`, pageAnalysis.h1Elements);
      console.log(`  Data-testids:`, pageAnalysis.dataTestIds.slice(0, 5));
      console.log(`  Page text preview:\n    "${pageAnalysis.pageTextPreview.replace(/\n/g, ' ')}"`);

      // Take screenshot
      const screenshotPath = join(__dirname, '..', `debug-list-${listId}.png`);
      await page.screenshot({ path: screenshotPath });
      console.log(`  📸 Screenshot: ${screenshotPath}`);
    }

    console.log('\n⏳ Browser will stay open for 30 seconds...');
    await new Promise(resolve => setTimeout(resolve, 30000));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔒 Browser closed');
  }
}

debugSingleList().catch(console.error);
