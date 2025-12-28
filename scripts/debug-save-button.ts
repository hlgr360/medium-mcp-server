import { BrowserMediumClient } from '../src/browser-client';

async function debugSaveButton() {
  const client = new BrowserMediumClient();

  try {
    // Launch visible browser for investigation
    await client.initialize(false);
    console.log('🌐 Browser launched (non-headless for debugging)');

    // Navigate to a sample article
    // TODO: Use a real Medium article URL for testing
    const testArticleUrl = 'https://medium.com/@harvardmicrosociety/antimicrobial-resistance-at-the-forefront-of-microbial-threats-in-todays-world-916128f38c42';
    await client['page']!.goto(testArticleUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    console.log('📄 Article page loaded');
    await client['page']!.waitForTimeout(3000);

    // Analyze save button selectors
    const analysis = await client['page']!.evaluate(() => {
      const possibleSelectors = [
        // Common bookmark/save button patterns
        '[data-testid*="save"]',
        '[data-testid*="bookmark"]',
        '[aria-label*="save" i]',
        '[aria-label*="bookmark" i]',
        'button:has-text("Save")',
        'button:has-text("Bookmark")',
        '[data-action="save"]',
        '[data-action="bookmark"]',
        '.bookmark-button',
        '.save-button'
      ];

      const findings: any = {
        foundButtons: [],
        allButtons: [],
        possibleSaveButtons: []
      };

      // Search for save buttons
      for (const selector of possibleSelectors) {
        try {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            findings.foundButtons.push({
              selector,
              count: elements.length,
              samples: Array.from(elements).slice(0, 3).map(el => ({
                tag: el.tagName,
                text: el.textContent?.trim().substring(0, 50),
                ariaLabel: el.getAttribute('aria-label'),
                dataTestId: el.getAttribute('data-testid'),
                className: el.className,
                visible: (el as HTMLElement).offsetParent !== null
              }))
            });
          }
        } catch (e) {
          // Selector not found or invalid
        }
      }

      // Get all buttons on page for analysis
      const allButtons = Array.from(document.querySelectorAll('button'));
      findings.allButtons = allButtons.map(btn => ({
        text: btn.textContent?.trim().substring(0, 50),
        ariaLabel: btn.getAttribute('aria-label'),
        dataTestId: btn.getAttribute('data-testid'),
        className: btn.className,
        visible: btn.offsetParent !== null
      })).slice(0, 20); // First 20 buttons

      // Look for buttons with bookmark/save-like text or icons
      findings.possibleSaveButtons = allButtons
        .filter(btn => {
          const text = btn.textContent?.toLowerCase() || '';
          const ariaLabel = btn.getAttribute('aria-label')?.toLowerCase() || '';
          const dataTestId = btn.getAttribute('data-testid')?.toLowerCase() || '';

          return text.includes('save') || text.includes('bookmark') ||
                 ariaLabel.includes('save') || ariaLabel.includes('bookmark') ||
                 dataTestId.includes('save') || dataTestId.includes('bookmark');
        })
        .map(btn => ({
          text: btn.textContent?.trim(),
          ariaLabel: btn.getAttribute('aria-label'),
          dataTestId: btn.getAttribute('data-testid'),
          className: btn.className,
          visible: btn.offsetParent !== null
        }));

      return findings;
    });

    console.log('\n📊 Save Button Analysis:');
    console.log(JSON.stringify(analysis, null, 2));

    // Keep browser open for manual inspection
    console.log('\n👀 Browser will stay open for 60 seconds for manual inspection...');
    console.log('   Look for the save/bookmark button on the article page');
    console.log('   Check browser DevTools to inspect button elements');
    await client['page']!.waitForTimeout(60000);

  } catch (error) {
    console.error('❌ Error during debugging:', error);
  } finally {
    await client.close();
    console.log('🔒 Browser closed');
  }
}

debugSaveButton().catch(console.error);
