import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

async function debugTabDetection() {
  const browser = await chromium.launch({ headless: false });
  const sessionPath = join(__dirname, '..', 'medium-session.json');

  let contextOptions: any = {
    viewport: { width: 1280, height: 1080 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  };

  if (existsSync(sessionPath)) {
    contextOptions.storageState = JSON.parse(readFileSync(sessionPath, 'utf-8'));
  }

  const context = await browser.newContext(contextOptions);
  const page = await context.newPage();

  await page.goto('https://medium.com/me/stories', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);

  console.log('Current URL:', page.url());
  console.log('Page title:', await page.title());

  await page.screenshot({ path: join(__dirname, '..', 'debug-tab-page.png'), fullPage: true });
  console.log('Screenshot saved to debug-tab-page.png\n');

  const tabInfo = await page.evaluate(() => {
    const allText: string[] = [];
    const buttons = document.querySelectorAll('button');
    const links = document.querySelectorAll('a');

    buttons.forEach(btn => {
      const text = btn.textContent?.trim();
      if (text && text.length > 0 && text.length < 50) {
        allText.push(`BUTTON: "${text}"`);
      }
    });

    links.forEach(a => {
      const text = a.textContent?.trim();
      if (text && text.length > 0 && text.length < 50) {
        allText.push(`LINK: "${text}"`);
      }
    });

    // Try to find specific tab-like elements
    const possibleTabs: string[] = [];
    document.querySelectorAll('*').forEach(el => {
      const text = el.textContent?.trim() || '';
      if (text.match(/^(Drafts|Published|Unlisted|Scheduled|Submissions?)\d*$/)) {
        possibleTabs.push(text);
      }
    });

    return { allText: allText.slice(0, 50), possibleTabs };
  });

  console.log('All button/link text (first 50):');
  tabInfo.allText.forEach(t => console.log(`  ${t}`));

  console.log('\nElements matching tab pattern:');
  tabInfo.possibleTabs.forEach(t => console.log(`  ${t}`));

  console.log('\nBrowser will stay open for 30 seconds...');
  await new Promise(r => setTimeout(r, 30000));
  await browser.close();
}

debugTabDetection().catch(console.error);
