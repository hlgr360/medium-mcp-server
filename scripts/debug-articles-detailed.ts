import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

async function debugArticlesDetailed() {
  console.log('🔍 Detailed articles DOM structure analysis...\n');

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

  console.log('🌐 Navigating to articles page...');
  await page.goto('https://medium.com/me/stories/public', { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForTimeout(3000);

  console.log('✅ Page loaded\n');

  // Extract detailed structure around article elements
  const articleStructure = await page.evaluate(() => {
    const results: any = {
      h2Elements: [],
      articleLinks: [],
      possibleContainers: []
    };

    // Find all h2 elements (potential article titles)
    const h2Elements = document.querySelectorAll('h2');
    h2Elements.forEach((h2, index) => {
      const text = h2.textContent?.trim();
      if (text && text.length > 0) {
        // Walk up the DOM to find the article container
        let current: HTMLElement | null = h2.parentElement;
        let depth = 0;
        const domPath: any[] = [];

        while (current && depth < 5) {
          domPath.push({
            tag: current.tagName.toLowerCase(),
            classes: current.className,
            id: current.id,
            testId: current.getAttribute('data-testid'),
            children: current.children.length
          });
          current = current.parentElement;
          depth++;
        }

        // Get siblings
        const parent = h2.parentElement;
        const siblings = parent ? Array.from(parent.children).map(el => ({
          tag: el.tagName.toLowerCase(),
          text: el.textContent?.trim().substring(0, 50),
          classes: el.className,
          href: el.getAttribute('href')
        })) : [];

        results.h2Elements.push({
          index,
          text: text.substring(0, 100),
          classes: h2.className,
          domPath,
          siblings
        });
      }
    });

    // Find all article edit links
    const editLinks = document.querySelectorAll('a[href*="/p/"][href*="/edit"]');
    editLinks.forEach((link, index) => {
      const href = link.getAttribute('href');
      const text = link.textContent?.trim();

      // Find parent container
      let current: HTMLElement | null = link.parentElement;
      let depth = 0;
      const domPath: any[] = [];

      while (current && depth < 5) {
        domPath.push({
          tag: current.tagName.toLowerCase(),
          classes: current.className,
          id: current.id,
          testId: current.getAttribute('data-testid')
        });
        current = current.parentElement;
        depth++;
      }

      results.articleLinks.push({
        index,
        href,
        text: text?.substring(0, 100),
        classes: link.className,
        domPath
      });
    });

    // Look for common parent containers of articles
    // Strategy: Find divs that contain both h2 and edit links
    const allDivs = document.querySelectorAll('div');
    allDivs.forEach(div => {
      const hasH2 = div.querySelector('h2') !== null;
      const hasEditLink = div.querySelector('a[href*="/p/"][href*="/edit"]') !== null;

      if (hasH2 && hasEditLink) {
        const h2Text = div.querySelector('h2')?.textContent?.trim();
        const editLink = div.querySelector('a[href*="/p/"][href*="/edit"]');

        results.possibleContainers.push({
          classes: div.className,
          id: div.id,
          testId: div.getAttribute('data-testid'),
          h2Text: h2Text?.substring(0, 100),
          editHref: editLink?.getAttribute('href'),
          outerHTML: div.outerHTML.substring(0, 500)
        });
      }
    });

    return results;
  });

  console.log('═══════════════════════════════════════════════════════════════');
  console.log('📌 H2 ELEMENTS (Article Titles) - DOM STRUCTURE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  articleStructure.h2Elements.forEach((item: any) => {
    console.log(`\n--- H2 #${item.index}: "${item.text}" ---`);
    console.log('Classes:', item.classes);
    console.log('\nDOM Path (from h2 upward):');
    item.domPath.forEach((level: any, i: number) => {
      console.log(`  Level ${i}: <${level.tag}> classes="${level.classes.substring(0, 80)}" ${level.testId ? `data-testid="${level.testId}"` : ''}`);
    });
    console.log('\nSiblings:');
    item.siblings.slice(0, 5).forEach((sib: any) => {
      console.log(`  <${sib.tag}> "${sib.text}" href="${sib.href || 'none'}"`);
    });
  });

  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('🔗 ARTICLE EDIT LINKS - DOM STRUCTURE');
  console.log('═══════════════════════════════════════════════════════════════\n');

  articleStructure.articleLinks.forEach((item: any) => {
    console.log(`\n--- Link #${item.index}: "${item.text}" ---`);
    console.log('Href:', item.href);
    console.log('Classes:', item.classes);
    console.log('\nDOM Path (from link upward):');
    item.domPath.forEach((level: any, i: number) => {
      console.log(`  Level ${i}: <${level.tag}> classes="${level.classes.substring(0, 80)}" ${level.testId ? `data-testid="${level.testId}"` : ''}`);
    });
  });

  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('📦 POSSIBLE ARTICLE CONTAINERS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  articleStructure.possibleContainers.forEach((container: any, i: number) => {
    console.log(`\n--- Container #${i} ---`);
    console.log('H2 Text:', container.h2Text);
    console.log('Edit Link:', container.editHref);
    console.log('Classes:', container.classes.substring(0, 100));
    console.log('TestId:', container.testId || 'none');
    console.log('HTML Preview:', container.outerHTML);
    console.log('');
  });

  // Extract a working selector suggestion
  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('💡 SUGGESTED SELECTORS');
  console.log('═══════════════════════════════════════════════════════════════\n');

  if (articleStructure.possibleContainers.length > 0) {
    const container = articleStructure.possibleContainers[0];
    console.log('Based on analysis, try these selectors:');
    console.log(`1. Find containers: By looking for divs containing both h2 and edit links`);
    console.log(`2. Extract title: querySelector('h2')`);
    console.log(`3. Extract URL: querySelector('a[href*="/p/"][href*="/edit"]').href`);
    console.log(`4. Common parent classes: ${container.classes.substring(0, 150)}`);
  }

  console.log('\n✅ Analysis complete!');
  console.log('⏳ Browser will stay open for 60 seconds...\n');

  await new Promise(resolve => setTimeout(resolve, 60000));
  await browser.close();
}

debugArticlesDetailed().catch(console.error);
