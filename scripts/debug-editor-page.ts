import { BrowserMediumClient } from '../src/browser-client';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function debugEditorPage() {
  console.log('🔍 Debugging Medium editor page...\n');

  const client = new BrowserMediumClient();

  try {
    // Initialize browser (non-headless to see what's happening)
    console.log('🌐 Initializing browser...');
    await client.initialize(false);

    // Access the page (it's private, but we can use reflection)
    const page = (client as any).page;
    if (!page) throw new Error('Page not initialized');

    console.log('🔐 Ensuring logged in...');
    await (client as any).ensureLoggedIn();

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
    const screenshotPath = join(__dirname, '..', 'debug-editor-page.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('  📸 Screenshot saved:', screenshotPath);

    // Analyze the page structure
    const analysis = await page.evaluate(() => {
      const results: any = {
        editableElements: [],
        headings: [],
        paragraphs: [],
        buttons: [],
        testIds: [],
        slateElements: [],
        contentEditableElements: []
      };

      // Find all contenteditable elements
      document.querySelectorAll('[contenteditable="true"]').forEach((el, i) => {
        results.contentEditableElements.push({
          index: i,
          tag: el.tagName.toLowerCase(),
          classes: el.className.substring(0, 100),
          placeholder: el.getAttribute('placeholder'),
          role: el.getAttribute('role'),
          'data-testid': el.getAttribute('data-testid'),
          'data-slate': el.hasAttribute('data-slate-editor'),
          text: el.textContent?.trim().substring(0, 50)
        });
      });

      // Find h1 elements (potential title)
      document.querySelectorAll('h1').forEach((el, i) => {
        results.headings.push({
          index: i,
          tag: 'h1',
          classes: el.className.substring(0, 100),
          contenteditable: el.getAttribute('contenteditable'),
          placeholder: el.getAttribute('placeholder'),
          'data-testid': el.getAttribute('data-testid'),
          text: el.textContent?.trim().substring(0, 50)
        });
      });

      // Find p elements (potential content)
      document.querySelectorAll('p').forEach((el, i) => {
        if (i < 10) { // First 10 only
          results.paragraphs.push({
            index: i,
            classes: el.className.substring(0, 100),
            contenteditable: el.getAttribute('contenteditable'),
            'data-testid': el.getAttribute('data-testid'),
            text: el.textContent?.trim().substring(0, 50)
          });
        }
      });

      // Find all buttons
      document.querySelectorAll('button').forEach((el, i) => {
        const text = el.textContent?.trim();
        if (text && text.length > 0 && text.length < 100) {
          results.buttons.push({
            index: i,
            text: text.substring(0, 50),
            'data-testid': el.getAttribute('data-testid'),
            'aria-label': el.getAttribute('aria-label'),
            classes: el.className.substring(0, 80)
          });
        }
      });

      // Find all elements with data-testid
      document.querySelectorAll('[data-testid]').forEach(el => {
        const testId = el.getAttribute('data-testid');
        if (testId && !results.testIds.find((t: any) => t.testId === testId)) {
          results.testIds.push({
            testId,
            tag: el.tagName.toLowerCase(),
            classes: el.className.substring(0, 80),
            text: el.textContent?.trim().substring(0, 40)
          });
        }
      });

      // Find Slate editor elements (common in modern rich text editors)
      document.querySelectorAll('[data-slate-editor], [data-slate-node]').forEach((el, i) => {
        if (i < 10) {
          results.slateElements.push({
            index: i,
            tag: el.tagName.toLowerCase(),
            'data-slate-editor': el.getAttribute('data-slate-editor'),
            'data-slate-node': el.getAttribute('data-slate-node'),
            contenteditable: el.getAttribute('contenteditable'),
            role: el.getAttribute('role'),
            classes: el.className.substring(0, 100)
          });
        }
      });

      return results;
    });

    // Save analysis to file
    const analysisPath = join(__dirname, '..', 'editor-analysis.json');
    writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 EDITOR PAGE ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════');

    console.log('\n✏️  CONTENTEDITABLE ELEMENTS:');
    analysis.contentEditableElements.forEach((el: any) => {
      console.log(`  ${el.index}. <${el.tag}> ${el.placeholder ? `placeholder="${el.placeholder}"` : ''}`);
      console.log(`     classes: ${el.classes}`);
      console.log(`     data-slate: ${el['data-slate']}`);
      if (el['data-testid']) console.log(`     data-testid: ${el['data-testid']}`);
      console.log('');
    });

    console.log('\n📝 H1 ELEMENTS (Title candidates):');
    analysis.headings.forEach((el: any) => {
      console.log(`  ${el.index}. ${el.placeholder || el.text || '(empty)'}`);
      console.log(`     contenteditable: ${el.contenteditable}`);
      console.log(`     classes: ${el.classes}`);
      if (el['data-testid']) console.log(`     data-testid: ${el['data-testid']}`);
      console.log('');
    });

    console.log('\n🔘 BUTTONS (first 10):');
    analysis.buttons.slice(0, 10).forEach((btn: any) => {
      console.log(`  "${btn.text}"`);
      if (btn['data-testid']) console.log(`    data-testid: ${btn['data-testid']}`);
      if (btn['aria-label']) console.log(`    aria-label: ${btn['aria-label']}`);
      console.log('');
    });

    console.log('\n🏷️  DATA-TESTID ELEMENTS (sample):');
    analysis.testIds.slice(0, 15).forEach((el: any) => {
      console.log(`  ${el.testId} (<${el.tag}>)`);
    });

    console.log('\n📐 SLATE EDITOR ELEMENTS:');
    if (analysis.slateElements.length > 0) {
      analysis.slateElements.forEach((el: any) => {
        console.log(`  <${el.tag}> contenteditable="${el.contenteditable}"`);
        console.log(`    data-slate-editor: ${el['data-slate-editor']}`);
        console.log(`    data-slate-node: ${el['data-slate-node']}`);
        console.log('');
      });
    } else {
      console.log('  None found');
    }

    console.log('\n💾 Full analysis saved to:', analysisPath);

    console.log('\n⏳ Browser will stay open for 60 seconds for manual inspection...');
    console.log('💡 Try typing in the editor manually to see which elements update');
    await new Promise(resolve => setTimeout(resolve, 60000));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔒 Browser closed');
  }
}

debugEditorPage().catch(console.error);
