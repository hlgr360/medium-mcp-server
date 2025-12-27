import { BrowserMediumClient } from '../src/browser-client';
import { join } from 'path';

async function debugPublishModal() {
  console.log('🔍 Debugging Medium publish modal...\n');

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

    console.log('⏳ Waiting for editor to load...');
    await page.waitForSelector('[data-testid="editorTitleParagraph"]', { timeout: 15000 });

    // Fill in some test content
    console.log('📝 Filling test content...');
    await page.click('[data-testid="editorTitleParagraph"]');
    await page.fill('[data-testid="editorTitleParagraph"]', 'Test Article for Modal Debug');

    await page.click('[data-testid="editorParagraphText"]');
    await page.keyboard.type('This is test content to debug the publish modal.');

    console.log('🔍 Looking for publish button...');

    // Try multiple publish button selectors
    const publishButtons = await page.$$('button');
    console.log(`  Found ${publishButtons.length} buttons on page`);

    for (const btn of publishButtons.slice(0, 20)) {
      const text = await btn.textContent();
      const testid = await btn.getAttribute('data-testid');
      if (text && (text.includes('Publish') || text.includes('Save') || text.includes('Draft'))) {
        console.log(`    Button: "${text.trim()}" | data-testid: ${testid}`);
      }
    }

    // Click the publish button
    console.log('\n🖱️  Clicking Publish button...');
    const publishBtn = page.locator('button:has-text("Publish")').first();
    if (await publishBtn.isVisible()) {
      await publishBtn.click();
      console.log('✅ Clicked Publish button');

      // Wait a bit for modal to appear
      await page.waitForTimeout(2000);

      // Analyze the modal
      console.log('\n📊 Analyzing publish modal...');

      const modalAnalysis = await page.evaluate(() => {
        const results: any = {
          inputs: [],
          buttons: [],
          testIds: [],
          tagRelated: []
        };

        // Find all inputs
        document.querySelectorAll('input').forEach(input => {
          const placeholder = input.getAttribute('placeholder');
          const testid = input.getAttribute('data-testid');
          const type = input.getAttribute('type');
          const name = input.getAttribute('name');

          results.inputs.push({
            placeholder,
            'data-testid': testid,
            type,
            name,
            classes: input.className.substring(0, 60)
          });

          // Check if tag-related
          if (placeholder?.toLowerCase().includes('tag') ||
              testid?.toLowerCase().includes('tag') ||
              name?.toLowerCase().includes('tag')) {
            results.tagRelated.push({ placeholder, testid, name });
          }
        });

        // Find all buttons in modal
        document.querySelectorAll('button').forEach(btn => {
          const text = btn.textContent?.trim();
          const testid = btn.getAttribute('data-testid');
          if (text && (text.includes('Publish') || text.includes('Save') || text.includes('Schedule') || text.includes('Tag'))) {
            results.buttons.push({ text, 'data-testid': testid });
          }
        });

        // Find all elements with data-testid
        document.querySelectorAll('[data-testid]').forEach(el => {
          const testid = el.getAttribute('data-testid');
          if (testid && (testid.includes('tag') || testid.includes('publish') || testid.includes('modal'))) {
            results.testIds.push({
              testid,
              tag: el.tagName.toLowerCase(),
              text: el.textContent?.substring(0, 40)
            });
          }
        });

        return results;
      });

      console.log('\n📝 INPUT ELEMENTS:');
      modalAnalysis.inputs.forEach((input: any) => {
        console.log(`  <input>`);
        console.log(`    placeholder: "${input.placeholder}"`);
        console.log(`    data-testid: ${input['data-testid']}`);
        console.log(`    type: ${input.type}`);
        console.log(`    name: ${input.name}`);
      });

      console.log('\n🏷️  TAG-RELATED ELEMENTS:');
      if (modalAnalysis.tagRelated.length > 0) {
        modalAnalysis.tagRelated.forEach((el: any) => {
          console.log(`  placeholder: "${el.placeholder}", testid: ${el.testid}, name: ${el.name}`);
        });
      } else {
        console.log('  None found');
      }

      console.log('\n🔘 BUTTONS IN MODAL:');
      modalAnalysis.buttons.forEach((btn: any) => {
        console.log(`  "${btn.text}" | data-testid: ${btn['data-testid']}`);
      });

      console.log('\n🏷️  DATA-TESTID ELEMENTS:');
      modalAnalysis.testIds.forEach((el: any) => {
        console.log(`  <${el.tag}> testid="${el.testid}" | text: "${el.text}"`);
      });

      // Screenshot
      const screenshotPath = join(__dirname, '..', 'debug-publish-modal.png');
      await page.screenshot({ path: screenshotPath, fullPage: true });
      console.log(`\n📸 Screenshot: ${screenshotPath}`);

      console.log('\n⏳ Browser will stay open for 60 seconds for manual inspection...');
      console.log('💡 You can manually test adding tags in the modal');
      await new Promise(resolve => setTimeout(resolve, 60000));

    } else {
      console.log('❌ Publish button not visible');
    }

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔒 Browser closed');
  }
}

debugPublishModal().catch(console.error);
