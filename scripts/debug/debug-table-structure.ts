import { chromium } from 'playwright';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

async function debugTableStructure() {
  console.log('🔍 Analyzing table structure in detail...\n');

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

  console.log('🌐 Navigating to main stories page...');
  await page.goto('https://medium.com/me/stories', { waitUntil: 'domcontentloaded', timeout: 15000 });
  await page.waitForTimeout(3000);

  // Analyze table structure
  const tableInfo = await page.evaluate(() => {
    const results: any = {
      headers: [],
      rows: []
    };

    // Get table headers
    const headers = document.querySelectorAll('table thead th');
    headers.forEach(th => {
      results.headers.push(th.textContent?.trim() || '');
    });

    // Get all rows and their cells
    const rows = document.querySelectorAll('table tbody tr');
    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td');
      const rowData: any = {
        rowIndex,
        cells: [],
        h2Text: row.querySelector('h2')?.textContent?.trim() || '',
        fullHTML: row.outerHTML.substring(0, 1000)
      };

      cells.forEach((cell, cellIndex) => {
        // Get all text content and HTML structure
        const links = Array.from(cell.querySelectorAll('a')).map(a => ({
          text: a.textContent?.trim(),
          href: a.getAttribute('href')
        }));

        const buttons = Array.from(cell.querySelectorAll('button')).map(btn => ({
          text: btn.textContent?.trim(),
          ariaLabel: btn.getAttribute('aria-label')
        }));

        const badges = Array.from(cell.querySelectorAll('[class*="badge"], [class*="label"], span, p')).map(el => ({
          text: el.textContent?.trim(),
          classes: el.className
        }));

        rowData.cells.push({
          cellIndex,
          text: cell.textContent?.trim(),
          classes: cell.className,
          links: links.filter(l => l.text || l.href),
          buttons: buttons.filter(b => b.text || b.ariaLabel),
          badges: badges.filter(b => b.text && b.text.length > 0 && b.text.length < 50).slice(0, 5),
          innerHTML: cell.innerHTML.substring(0, 300)
        });
      });

      results.rows.push(rowData);
    });

    return results;
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📊 TABLE HEADERS');
  console.log('═══════════════════════════════════════════════════════════════');
  tableInfo.headers.forEach((header: string, i: number) => {
    console.log(`  Column ${i}: "${header}"`);
  });

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('📋 TABLE ROWS (Detailed Cell Analysis)');
  console.log('═══════════════════════════════════════════════════════════════');

  tableInfo.rows.forEach((row: any) => {
    console.log(`\n🔹 Row ${row.rowIndex}: "${row.h2Text}"`);
    console.log('-'.repeat(80));

    row.cells.forEach((cell: any) => {
      console.log(`\n  📌 Cell ${cell.cellIndex} (Header: "${tableInfo.headers[cell.cellIndex]}")`);
      console.log(`     Text: "${cell.text.substring(0, 100)}"`);

      if (cell.links.length > 0) {
        console.log(`     Links:`);
        cell.links.forEach((link: any) => {
          console.log(`       - "${link.text}" → ${link.href}`);
        });
      }

      if (cell.buttons.length > 0) {
        console.log(`     Buttons:`);
        cell.buttons.forEach((btn: any) => {
          console.log(`       - "${btn.text}" (${btn.ariaLabel})`);
        });
      }

      if (cell.badges.length > 0) {
        console.log(`     Elements/Badges:`);
        cell.badges.forEach((badge: any) => {
          console.log(`       - "${badge.text}"`);
        });
      }
    });

    console.log(`\n  📄 HTML Preview: ${row.fullHTML}`);
  });

  console.log('\n\n═══════════════════════════════════════════════════════════════');
  console.log('💡 STATUS EXTRACTION STRATEGY');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('Look for the column that contains status information (Draft/Published/etc)');
  console.log('This is typically in the "Status" or "Publication" column');

  console.log('\n⏳ Browser will stay open for 30 seconds...');
  await new Promise(resolve => setTimeout(resolve, 30000));
  await browser.close();
}

debugTableStructure().catch(console.error);
