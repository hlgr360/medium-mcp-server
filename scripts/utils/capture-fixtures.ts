/**
 * Fixture Capture Script
 *
 * Captures HTML snapshots from Medium pages to use as test fixtures.
 * This allows integration tests to run without requiring a live browser
 * or Medium account.
 *
 * Usage:
 *   npx ts-node scripts/capture-fixtures.ts
 *
 * Requirements:
 *   - Valid Medium session (run login-to-medium first)
 *   - Session file must exist at medium-session.json
 */

import { BrowserMediumClient } from '../../src/browser-client';
import { writeFileSync, existsSync } from 'fs';
import { join } from 'path';

async function captureFixtures() {
  const fixturesDir = join(__dirname, '..', 'tests', 'fixtures');
  const sessionPath = join(__dirname, '..', 'medium-session.json');

  // Check for session file
  if (!existsSync(sessionPath)) {
    console.error('❌ No session file found!');
    console.error('   Please run login-to-medium tool first to create a session.');
    process.exit(1);
  }

  const client = new BrowserMediumClient();

  try {
    console.log('🚀 Starting fixture capture...\n');
    console.log('This will navigate to various Medium pages and save HTML snapshots.');
    console.log('Fixtures will be saved to: tests/fixtures/\n');

    await client.initialize();

    // Capture 1: User articles page (with tabs)
    console.log('📄 [1/5] Capturing user articles page...');
    await client['page']!.goto('https://medium.com/me/stories', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await client['page']!.waitForTimeout(3000);
    const userArticlesHTML = await client['page']!.content();
    writeFileSync(join(fixturesDir, 'user-articles-page.html'), userArticlesHTML);
    console.log('   ✅ Saved user-articles-page.html\n');

    // Capture 2: Reading lists page
    console.log('📚 [2/5] Capturing reading lists page...');
    await client['page']!.goto('https://medium.com/me/lists', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await client['page']!.waitForTimeout(3000);
    const listsHTML = await client['page']!.content();
    writeFileSync(join(fixturesDir, 'reading-lists-page.html'), listsHTML);
    console.log('   ✅ Saved reading-lists-page.html\n');

    // Capture 3: Public article content
    console.log('📖 [3/5] Capturing public article content...');
    const publicArticleUrl = 'https://blog.medium.com/welcome-to-medium-9e53ca408c48';
    await client['page']!.goto(publicArticleUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await client['page']!.waitForTimeout(3000);
    const articleContentHTML = await client['page']!.content();
    writeFileSync(join(fixturesDir, 'article-content-public.html'), articleContentHTML);
    console.log('   ✅ Saved article-content-public.html\n');

    // Capture 4: Feed page (Featured)
    console.log('📰 [4/5] Capturing feed page (Featured)...');
    await client['page']!.goto('https://medium.com/', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });
    await client['page']!.waitForTimeout(2000);

    // Try to click Featured tab
    try {
      const featuredTab = client['page']!.locator('button:has-text("Featured"), a:has-text("Featured")').first();
      await featuredTab.click();
      await client['page']!.waitForTimeout(2000);
    } catch (error) {
      console.log('   ⚠️  Could not click Featured tab, using default homepage');
    }

    const feedHTML = await client['page']!.content();
    writeFileSync(join(fixturesDir, 'feed-featured.html'), feedHTML);
    console.log('   ✅ Saved feed-featured.html\n');

    // Capture 5: Empty state (create a minimal valid HTML for empty tests)
    console.log('📝 [5/5] Creating empty state fixtures...');
    const emptyArticlesHTML = `
<!DOCTYPE html>
<html>
<head><title>Medium - Your Stories</title></head>
<body>
  <nav>
    <button>Drafts0</button>
    <button>Published0</button>
  </nav>
  <main>
    <table><tbody></tbody></table>
    <p>You haven't written any stories yet.</p>
  </main>
</body>
</html>
`.trim();

    const emptyListsHTML = `
<!DOCTYPE html>
<html>
<head><title>Medium - Your Lists</title></head>
<body>
  <main>
    <h1>Your reading lists</h1>
    <p>You haven't created any lists yet.</p>
  </main>
</body>
</html>
`.trim();

    writeFileSync(join(fixturesDir, 'user-articles-empty.html'), emptyArticlesHTML);
    writeFileSync(join(fixturesDir, 'reading-lists-empty.html'), emptyListsHTML);
    console.log('   ✅ Created empty state fixtures\n');

    console.log('✨ Fixture capture complete!\n');
    console.log('Captured fixtures:');
    console.log('   • user-articles-page.html     - Your articles with tabs');
    console.log('   • user-articles-empty.html    - Empty articles page');
    console.log('   • reading-lists-page.html     - Your reading lists');
    console.log('   • reading-lists-empty.html    - Empty lists page');
    console.log('   • article-content-public.html - Public article content');
    console.log('   • feed-featured.html          - Featured feed articles\n');

    console.log('💡 You can now run integration tests with these fixtures!');
    console.log('   npm run test:unit -- tests/integration/');

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Error capturing fixtures:', message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

captureFixtures().catch(console.error);
