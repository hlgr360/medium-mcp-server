import { BrowserMediumClient } from '../../src/browser-client';
import { writeFileSync } from 'fs';
import { join } from 'path';

async function debugListsPage() {
  console.log('🔍 Debugging Medium lists page...\n');

  const client = new BrowserMediumClient();

  try {
    console.log('🌐 Initializing browser...');
    await client.initialize(false);

    const page = (client as any).page;
    if (!page) throw new Error('Page not initialized');

    console.log('🔐 Ensuring logged in...');
    await (client as any).ensureLoggedIn();

    console.log('🌐 Navigating to lists page...');
    await page.goto('https://medium.com/me/lists', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    console.log('⏳ Waiting for page to load...');
    await page.waitForTimeout(5000);

    console.log('\n📄 Current page:');
    console.log('  URL:', page.url());
    console.log('  Title:', await page.title());

    // Take screenshot
    const screenshotPath = join(__dirname, '..', '..', '.debug', 'screenshots', 'debug-lists-page.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    console.log('  📸 Screenshot:', screenshotPath);

    // Analyze the page structure
    const analysis = await page.evaluate(() => {
      const results: any = {
        listElements: [],
        links: [],
        headings: [],
        testIds: [],
        emptyState: null,
        pageText: ''
      };

      // Get page text to detect empty states
      const bodyText = document.body.textContent || '';
      results.pageText = bodyText.substring(0, 500);

      // Check for empty state messages
      if (bodyText.includes('no lists') || bodyText.includes('create a list') ||
          bodyText.includes('Start a list') || bodyText.includes('No lists yet')) {
        results.emptyState = 'Found empty state message';
      }

      // Find links that might be lists
      document.querySelectorAll('a[href*="/list/"]').forEach((el, i) => {
        if (i < 20) {
          const href = (el as HTMLAnchorElement).href;
          const listIdMatch = href.match(/\/list\/([^\/]+)/);
          results.links.push({
            href,
            listId: listIdMatch ? listIdMatch[1] : null,
            text: el.textContent?.trim().substring(0, 100),
            classes: el.className.substring(0, 80)
          });
        }
      });

      // Find potential list cards
      const cardSelectors = [
        'article',
        'div[role="article"]',
        '[data-testid="list-card"]',
        '.list-item',
        'a[href*="/list/"]'
      ];

      for (const selector of cardSelectors) {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          results.listElements.push({
            selector,
            count: elements.length,
            sample: elements[0]?.textContent?.trim().substring(0, 100)
          });
        }
      }

      // Find headings (might be list names)
      document.querySelectorAll('h1, h2, h3, h4').forEach((el, i) => {
        if (i < 20) {
          const text = el.textContent?.trim();
          if (text && text.length > 0 && text.length < 200) {
            results.headings.push({
              tag: el.tagName.toLowerCase(),
              text: text.substring(0, 100),
              classes: el.className.substring(0, 80)
            });
          }
        }
      });

      // Find elements with data-testid
      document.querySelectorAll('[data-testid]').forEach((el, i) => {
        if (i < 30) {
          const testId = el.getAttribute('data-testid');
          results.testIds.push({
            testId,
            tag: el.tagName.toLowerCase(),
            text: el.textContent?.trim().substring(0, 40)
          });
        }
      });

      return results;
    });

    // Save analysis to file
    const analysisPath = join(__dirname, '..', '..', '.debug', 'analysis', 'lists-page-analysis.json');
    writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));

    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('📊 LISTS PAGE ANALYSIS');
    console.log('═══════════════════════════════════════════════════════════════');

    console.log('\n📄 PAGE TEXT (first 500 chars):');
    console.log(analysis.pageText);

    if (analysis.emptyState) {
      console.log('\n⚠️  EMPTY STATE DETECTED:', analysis.emptyState);
      console.log('   This means you likely have no lists created yet.');
      console.log('   Visit https://medium.com/me/lists to create your first list.');
    }

    console.log('\n🔗 LINKS WITH /list/ in href:');
    if (analysis.links.length > 0) {
      analysis.links.forEach((link: any) => {
        console.log(`  List ID: ${link.listId}`);
        console.log(`  Text: "${link.text}"`);
        console.log(`  URL: ${link.href}`);
        console.log('');
      });
    } else {
      console.log('  ❌ No links with /list/ pattern found');
    }

    console.log('\n📦 POTENTIAL LIST ELEMENTS:');
    if (analysis.listElements.length > 0) {
      analysis.listElements.forEach((el: any) => {
        console.log(`  Selector: ${el.selector}`);
        console.log(`  Count: ${el.count}`);
        console.log(`  Sample: "${el.sample}"`);
        console.log('');
      });
    } else {
      console.log('  ❌ No list elements found');
    }

    console.log('\n📝 HEADINGS:');
    if (analysis.headings.length > 0) {
      analysis.headings.slice(0, 10).forEach((h: any) => {
        console.log(`  <${h.tag}> "${h.text}"`);
      });
    } else {
      console.log('  ❌ No headings found');
    }

    console.log('\n🏷️  DATA-TESTID ELEMENTS (first 15):');
    if (analysis.testIds.length > 0) {
      analysis.testIds.slice(0, 15).forEach((el: any) => {
        console.log(`  ${el.testId} (<${el.tag}>)`);
      });
    }

    console.log('\n💾 Full analysis saved to:', analysisPath);

    console.log('\n⏳ Browser will stay open for 60 seconds for manual inspection...');
    console.log('💡 Check if you see any lists on the page visually');
    await new Promise(resolve => setTimeout(resolve, 60000));

  } catch (error: any) {
    console.error('\n❌ Error:', error.message);
  } finally {
    await client.close();
    console.log('\n🔒 Browser closed');
  }
}

debugListsPage().catch(console.error);
