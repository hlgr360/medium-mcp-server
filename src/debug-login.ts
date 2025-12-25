import { chromium } from 'playwright';

async function debugLogin() {
  console.log('🔍 Starting login debug session...\n');

  const browser = await chromium.launch({
    headless: false, // Visible browser
    slowMo: 100,
    args: [
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-blink-features=AutomationControlled'
    ]
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });

  const page = await context.newPage();

  console.log('🌐 Navigating to Medium...');
  await page.goto('https://medium.com');
  await page.waitForLoadState('networkidle');

  console.log('\n📋 Current page analysis (before login):');
  console.log('URL:', page.url());
  console.log('Title:', await page.title());

  // Check for login indicators
  const selectors = [
    '[data-testid="headerUserButton"]',
    '.avatar',
    '[data-testid="user-menu"]',
    'button[aria-label*="user"]',
    'img[alt*="avatar"]',
    '[data-testid="write-button"]',
    'a[href="/me/stories"]',
    'button:has-text("Sign in")',
    'a:has-text("Sign in")'
  ];

  console.log('\n🔍 Checking selectors on page:');
  for (const selector of selectors) {
    const element = await page.$(selector);
    console.log(`  ${selector}: ${element ? '✅ FOUND' : '❌ NOT FOUND'}`);
  }

  console.log('\n🔐 Please log in to Medium now in the browser window...');
  console.log('⏳ Will automatically analyze the page in 45 seconds...');
  console.log('📝 IMPORTANT: Complete the FULL login process:');
  console.log('   1. Enter email/password and submit');
  console.log('   2. Close any popups/modals that appear');
  console.log('   3. Make sure you see your profile avatar/icon');
  console.log('   4. Wait for the analysis...\n');

  // Wait 45 seconds for user to log in
  await new Promise(resolve => setTimeout(resolve, 45000));

  console.log('\n📋 Page analysis AFTER login:');
  console.log('URL:', page.url());
  console.log('Title:', await page.title());

  console.log('\n🔍 Checking login indicator selectors:');
  for (const selector of selectors) {
    const element = await page.$(selector);
    console.log(`  ${selector}: ${element ? '✅ FOUND' : '❌ NOT FOUND'}`);
  }

  // Dump all button and link elements for analysis
  console.log('\n🔍 All buttons on page:');
  const buttons = await page.$$eval('button', (btns) =>
    btns.map(btn => ({
      text: btn.textContent?.trim().substring(0, 50),
      testId: btn.getAttribute('data-testid'),
      ariaLabel: btn.getAttribute('aria-label'),
      classes: btn.className
    })).filter(btn => btn.text || btn.testId || btn.ariaLabel).slice(0, 20)
  );
  buttons.forEach(btn => console.log('  ', JSON.stringify(btn)));

  console.log('\n🔍 All images (potential avatars):');
  const images = await page.$$eval('img', (imgs) =>
    imgs.map(img => ({
      alt: img.alt,
      src: img.src.substring(0, 80),
      classes: img.className
    })).filter(img => img.alt || img.classes).slice(0, 10)
  );
  images.forEach(img => console.log('  ', JSON.stringify(img)));

  console.log('\n🔍 Elements with data-testid:');
  const testIdElements = await page.$$eval('[data-testid]', (elements) =>
    elements.map(el => ({
      testId: el.getAttribute('data-testid'),
      tag: el.tagName.toLowerCase(),
      text: el.textContent?.trim().substring(0, 50)
    })).slice(0, 20)
  );
  testIdElements.forEach(el => console.log('  ', JSON.stringify(el)));

  console.log('\n✅ Debug complete!');
  console.log('⏳ Browser will close in 10 seconds (inspect it now if needed)...\n');

  await new Promise(resolve => setTimeout(resolve, 10000));

  await browser.close();
  console.log('🔒 Browser closed');
}

debugLogin().catch(console.error);
