import { BrowserMediumClient } from '../src/browser-client';
import { existsSync } from 'fs';
import { join } from 'path';

async function testSessionFlow() {
  console.log('🧪 Testing session persistence across operations...\n');

  const sessionPath = join(process.cwd(), 'medium-session.json');

  // Step 1: Check if we have a session
  console.log('=== STEP 1: Check Existing Session ===');
  if (existsSync(sessionPath)) {
    console.log('✅ Session file exists');
    const fs = require('fs');
    const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
    console.log(`📊 Session has ${sessionData.cookies?.length || 0} cookies`);
  } else {
    console.log('❌ No session file found - you need to login first');
    console.log('   Run: node dist/test-login.js');
    process.exit(1);
  }

  // Step 2: Test session loading with a new browser instance (simulates subsequent operation)
  console.log('\n=== STEP 2: Simulate Subsequent Operation (Article Reading) ===');
  console.log('Creating NEW browser instance (like get-article-content would)...\n');

  const client = new BrowserMediumClient();

  try {
    // Initialize browser - should load the saved session
    console.log('📍 Calling initialize()...');
    await client.initialize(); // Use default headless mode
    console.log('✅ Browser initialized\n');

    // Validate session (this is what withBrowserSession does)
    console.log('📍 Calling validateSessionFast()...');
    const isValid = await client.validateSessionFast();
    console.log(`Result: ${isValid ? '✅ Session is valid' : '❌ Session is invalid'}\n`);

    if (!isValid) {
      console.log('⚠️  Session validation failed! This is the problem.');
      console.log('    The session file exists but validateSessionFast() says it\'s invalid.');
      console.log('    This would cause ensureLoggedIn() to be called, but it might not work in headless mode.\n');
    }

    // Try to get article content (with login if needed)
    console.log('📍 Calling getArticleContent() with a test article...');
    const testUrl = 'https://medium.com/@medium/welcome-to-medium-9e53ca408c48';
    console.log(`   URL: ${testUrl}\n`);

    const content = await client.getArticleContent(testUrl, true);

    console.log('\n=== RESULT ===');
    console.log(`Content length: ${content.length} characters`);
    if (content.length > 200) {
      console.log('✅ Successfully retrieved article content');
      console.log(`Preview: ${content.substring(0, 200)}...`);
    } else {
      console.log('⚠️  Content seems short - might be preview only or error');
      console.log(`Content: ${content}`);
    }

    await client.close();
    console.log('\n✅ Test complete');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await client.close();
    process.exit(1);
  }
}

testSessionFlow().catch(console.error);
