import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

async function debugPublishFlow() {
  console.log('🔍 Debugging Medium publish flow and selectors...\n');

  const browser = await chromium.launch({
    headless: false,
    slowMo: 500,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const sessionPath = join(__dirname, '..', 'medium-session.json');
  let contextOptions: any = {
    viewport: { width: 1280, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    extraHTTPHeaders: {
      'Accept-Language': 'en-US,en;q=0.9'
    }
  };

  if (existsSync(sessionPath)) {
    const sessionData = JSON.parse(readFileSync(sessionPath, 'utf-8'));
    contextOptions.storageState = sessionData;
    console.log('✅ Loaded session from file\n');
  }

  const context = await browser.newContext(contextOptions);
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', {
      get: () => undefined,
    });
  });

  const page = await context.newPage();

  console.log('🌐 Navigating to new story page...');
  await page.goto('https://medium.com/new-story', {
    waitUntil: 'domcontentloaded',
    timeout: 30000
  });

  console.log('⏳ Waiting for page to load...');
  await page.waitForTimeout(5000);

  console.log('\n📄 Current page:');
  console.log('  URL:', page.url());
  console.log('  Title:', await page.title());

  // Take screenshot
  const screenshotPath = join(__dirname, '..', '..', '.debug', 'screenshots', 'debug-publish-page.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log('  📸 Screenshot:', screenshotPath);

  // Check for editor selectors
  console.log('\n🔍 Checking editor selectors:');
  const editorSelectors = [
    '[data-testid="richTextEditor"]',
    '[contenteditable="true"]',
    '[role="textbox"]',
    '.editor',
    'article',
    'div[data-slate-editor="true"]'
  ];

  for (const selector of editorSelectors) {
    const element = await page.$(selector);
    console.log(`  ${selector}: ${element ? '✅ FOUND' : '❌ NOT FOUND'}`);
  }

  // Check for title field
  console.log('\n📝 Checking title field selectors:');
  const titleSelectors = [
    '[data-testid="richTextEditor"] h1',
    '[placeholder*="Title"]',
    'h1[contenteditable="true"]',
    'h1[data-slate-node="element"]',
    '.graf--title',
    'h1.graf'
  ];

  for (const selector of titleSelectors) {
    const element = await page.$(selector);
    console.log(`  ${selector}: ${element ? '✅ FOUND' : '❌ NOT FOUND'}`);
  }

  // Check for content paragraph
  console.log('\n📄 Checking content paragraph selectors:');
  const contentSelectors = [
    '[data-testid="richTextEditor"] p',
    'p[contenteditable="true"]',
    'p[data-slate-node="element"]',
    '.graf--p',
    'p.graf'
  ];

  for (const selector of contentSelectors) {
    const elements = await page.$$(selector);
    console.log(`  ${selector}: ${elements.length > 0 ? `✅ FOUND (${elements.length})` : '❌ NOT FOUND'}`);
  }

  // Check for publish buttons
  console.log('\n🚀 Checking publish button selectors:');
  const publishButtonSelectors = [
    'button:has-text("Publish")',
    '[data-testid="publish-button"]',
    'button[aria-label*="Publish"]',
    'button:has-text("Ready to publish")'
  ];

  for (const selector of publishButtonSelectors) {
    try {
      const element = await page.$(selector);
      console.log(`  ${selector}: ${element ? '✅ FOUND' : '❌ NOT FOUND'}`);
    } catch {
      console.log(`  ${selector}: ❌ INVALID SELECTOR`);
    }
  }

  // Find all buttons on page
  console.log('\n🔘 All buttons on page:');
  const buttons = await page.$$eval('button', (btns) =>
    btns.map(btn => ({
      text: btn.textContent?.trim().substring(0, 50),
      testId: btn.getAttribute('data-testid'),
      ariaLabel: btn.getAttribute('aria-label')
    })).filter(b => b.text || b.testId || b.ariaLabel).slice(0, 20)
  );
  buttons.forEach(btn => console.log('  ', JSON.stringify(btn)));

  // Check data-testid elements
  console.log('\n🏷️  Elements with data-testid:');
  const testIds = await page.$$eval('[data-testid]', (elements) =>
    elements.map(el => ({
      testId: el.getAttribute('data-testid'),
      tag: el.tagName.toLowerCase(),
      text: el.textContent?.trim().substring(0, 40)
    })).slice(0, 20)
  );
  testIds.forEach(el => console.log('  ', JSON.stringify(el)));

  console.log('\n💡 Test the flow manually:');
  console.log('  1. Type a title in the editor');
  console.log('  2. Type some content');
  console.log('  3. Look for the Publish button');
  console.log('  4. Click it and observe the modal/dialog');
  console.log('  5. Note which selectors work');

  console.log('\n⏳ Browser will stay open for 2 minutes for manual testing...');
  await new Promise(resolve => setTimeout(resolve, 120000));
  await browser.close();
}

debugPublishFlow().catch(console.error);
