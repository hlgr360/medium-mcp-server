import { BrowserMediumClient } from '../src/browser-client';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

async function testFullArticleFlow() {
  console.log('🧪 Testing FULL article flow including getArticleContent()...\n');

  const sessionPath = join(process.cwd(), 'medium-session.json');
  const testUrl = 'https://medium.com/@medium/welcome-to-medium-9e53ca408c48';

  // Fresh start
  if (existsSync(sessionPath)) {
    unlinkSync(sessionPath);
    console.log('🗑️  Deleted session\n');
  }

  // === First article read (no session) ===
  console.log('=== FIRST Article Read (Simulating withBrowserSession + getArticleContent) ===\n');

  const client1 = new BrowserMediumClient();

  try {
    await client1.initialize();
    console.log('✅ Browser initialized');

    const isValid1 = await client1.validateSessionFast();
    console.log(`Session validation: ${isValid1 ? '✅ Valid' : '❌ Invalid'}`);

    if (!isValid1) {
      console.log('Calling ensureLoggedIn()...\n');
      await client1.ensureLoggedIn();
    }

    console.log('\n📖 Now calling getArticleContent()...');
    console.log('⚠️  Watch for DUPLICATE login checking!\n');

    const content1 = await client1.getArticleContent(testUrl, true);
    console.log(`✅ Got content: ${content1.length} characters\n`);

    await client1.close();

  } catch (error) {
    console.error('❌ Error:', error);
    await client1.close();
  }

  // === Second article read (should use session) ===
  console.log('\n=== SECOND Article Read (Should NOT prompt for login) ===\n');

  if (!existsSync(sessionPath)) {
    console.log('❌ No session file - first read failed to save');
    process.exit(1);
  }

  const client2 = new BrowserMediumClient();

  try {
    await client2.initialize();
    console.log('✅ Browser initialized (should load session)');

    const isValid2 = await client2.validateSessionFast();
    console.log(`Session validation: ${isValid2 ? '✅ Valid' : '❌ Invalid (BUG!)'}`);

    if (!isValid2) {
      console.log('\n⚠️  BUG: Session exists but validation failed!');
      console.log('   This will cause ensureLoggedIn() to be called again.\n');
      await client2.ensureLoggedIn();
    }

    console.log('\n📖 Now calling getArticleContent()...');
    const content2 = await client2.getArticleContent(testUrl, true);
    console.log(`✅ Got content: ${content2.length} characters\n`);

    await client2.close();
    console.log('✅ Test complete - check logs for duplicate login checks');

  } catch (error) {
    console.error('❌ Error:', error);
    await client2.close();
  }
}

testFullArticleFlow().catch(console.error);
