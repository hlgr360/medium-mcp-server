import { BrowserMediumClient } from '../src/browser-client';
import { join } from 'path';

async function debugEditorWait() {
  console.log('🔍 Debugging Medium editor with extended wait...\n');

  const client = new BrowserMediumClient();

  try {
    console.log('🌐 Initializing browser...');
    await client.initialize(false);

    const page = (client as any).page;
    if (!page) throw new Error('Page not initialized');

    console.log('🔐 Ensuring logged in...');
    await (client as any).ensureLoggedIn();

    console.log('🌐 Navigating to new story page...');
    await page.goto('https://medium.com/new-story', {
      waitUntil: 'networkidle',
      timeout: 30000
    });

    console.log('⏳ Waiting for editor to load (15 seconds)...');
    await page.waitForTimeout(15000);

    // Check for iframes
    console.log('\n🖼️  Checking for iframes:');
    const frames = page.frames();
    console.log(`  Found ${frames.length} frame(s)`);
    frames.forEach((frame: any, i: number) => {
      console.log(`    Frame ${i}: ${frame.url()}`);
    });

    // Try multiple strategies to find editor
    console.log('\n🔍 Trying to find editor elements:');

    // Strategy 1: Wait for any contenteditable
    try {
      console.log('  Strategy 1: Waiting for [contenteditable="true"]...');
      await page.waitForSelector('[contenteditable="true"]', { timeout: 10000 });
      console.log('    ✅ Found contenteditable element!');
    } catch {
      console.log('    ❌ No contenteditable found');
    }

    // Strategy 2: Wait for title placeholder
    try {
      console.log('  Strategy 2: Waiting for title placeholder...');
      const titleFound = await page.waitForSelector('[placeholder*="Title"], h1[contenteditable]', { timeout: 5000 });
      console.log(`    ✅ Found title element: ${titleFound ? 'YES' : 'NO'}`);
    } catch {
      console.log('    ❌ No title placeholder found');
    }

    // Strategy 3: Check if we need to click something first
    console.log('  Strategy 3: Looking for "Start writing" or similar...');
    const startButtons = await page.$$('button, div[role="button"], a');
    for (const btn of startButtons.slice(0, 20)) {
      const text = await btn.textContent();
      if (text && (text.includes('Start') || text.includes('Write') || text.includes('New'))) {
        console.log(`    Found potential starter: "${text.trim()}"`);
      }
    }

    // Now analyze what's actually on the page
    console.log('\n📄 Current page analysis:');
    const html = await page.content();
    console.log(`  HTML length: ${html.length} chars`);
    console.log(`  Contains 'contenteditable': ${html.includes('contenteditable')}`);
    console.log(`  Contains 'placeholder': ${html.includes('placeholder')}`);
    console.log(`  Contains 'editor': ${html.toLowerCase().includes('editor')}`);

    // Get all visible elements
    const elements = await page.evaluate(() => {
      const results: any = {
        all_divs_with_role: [],
        all_with_placeholder: [],
        all_contenteditable: [],
        main_content: ''
      };

      // Find divs with role
      document.querySelectorAll('div[role]').forEach(el => {
        results.all_divs_with_role.push({
          role: el.getAttribute('role'),
          classes: el.className.substring(0, 60),
          text: el.textContent?.trim().substring(0, 40)
        });
      });

      // Find anything with placeholder
      document.querySelectorAll('[placeholder]').forEach(el => {
        results.all_with_placeholder.push({
          tag: el.tagName.toLowerCase(),
          placeholder: el.getAttribute('placeholder'),
          type: el.getAttribute('type'),
          contenteditable: el.getAttribute('contenteditable')
        });
      });

      // Find all contenteditable
      document.querySelectorAll('[contenteditable]').forEach(el => {
        results.all_contenteditable.push({
          tag: el.tagName.toLowerCase(),
          contenteditable: el.getAttribute('contenteditable'),
          placeholder: el.getAttribute('placeholder'),
          classes: el.className.substring(0, 80)
        });
      });

      // Get main/article content
      const main = document.querySelector('main, article, [role="main"]');
      if (main) {
        results.main_content = main.innerHTML.substring(0, 1000);
      }

      return results;
    });

    console.log('\n📊 Elements found:');
    console.log('  Divs with role:', elements.all_divs_with_role.length);
    console.log('  Elements with placeholder:', elements.all_with_placeholder.length);
    console.log('  Contenteditable elements:', elements.all_contenteditable.length);

    if (elements.all_with_placeholder.length > 0) {
      console.log('\n📝 Elements with placeholder:');
      elements.all_with_placeholder.forEach((el: any) => {
        console.log(`  <${el.tag}> placeholder="${el.placeholder}"`);
        console.log(`    contenteditable: ${el.contenteditable}`);
      });
    }

    if (elements.all_contenteditable.length > 0) {
      console.log('\n✏️  Contenteditable elements:');
      elements.all_contenteditable.forEach((el: any) => {
        console.log(`  <${el.tag}> contenteditable="${el.contenteditable}"`);
        if (el.placeholder) console.log(`    placeholder: "${el.placeholder}"`);
        console.log(`    classes: ${el.classes}`);
      });
    }

    if (elements.main_content) {
      console.log('\n📄 Main content HTML preview:');
      console.log(elements.main_content);
    }

    // Screenshot
    const screenshotPath = join(__dirname, '..', 'debug-editor-wait.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('\n📸 Screenshot:', screenshotPath);

    console.log('\n⏳ Browser will stay open for manual inspection (90 seconds)...');
    console.log('💡 Please observe:');
    console.log('   - Can you see the editor on screen?');
    console.log('   - Can you click and type in it?');
    console.log('   - What placeholder text does it show?');
    await new Promise(resolve => setTimeout(resolve, 90000));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔒 Browser closed');
  }
}

debugEditorWait().catch(console.error);
