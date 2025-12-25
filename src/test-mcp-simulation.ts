import { BrowserMediumClient } from './browser-client';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

/**
 * This test EXACTLY simulates what the MCP server does:
 * - Each operation creates a NEW BrowserMediumClient instance
 * - Browser is closed after each operation (in finally block)
 * - Next operation creates a COMPLETELY NEW browser instance
 */
async function simulateMcpServerBehavior() {
  console.log('🧪 Simulating EXACT MCP server behavior...\n');

  const sessionPath = join(process.cwd(), 'medium-session.json');
  const testUrl = 'https://medium.com/@medium/welcome-to-medium-9e53ca408c48';

  // Clean start
  if (existsSync(sessionPath)) {
    unlinkSync(sessionPath);
    console.log('🗑️  Deleted session for fresh test\n');
  }

  // ========================================
  // FIRST OPERATION: get-article-content (no session)
  // ========================================
  console.log('=== FIRST OPERATION: get-article-content (No Session) ===\n');

  try {
    const client1 = new BrowserMediumClient();

    try {
      // This is what withBrowserSession does
      await client1.initialize();
      console.log('✅ Browser 1 initialized');

      const isValid1 = await client1.validateSessionFast();
      console.log(`Session validation: ${isValid1 ? '✅ Valid' : '❌ Invalid'}`);

      if (!isValid1) {
        console.log('Calling ensureLoggedIn()...\n');
        const loginSuccess = await client1.ensureLoggedIn();

        if (loginSuccess) {
          console.log('\n✅ Login successful');

          // Verify session file was created
          if (existsSync(sessionPath)) {
            console.log('✅ Session file created');
            const fs = require('fs');
            const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
            console.log(`📊 Session has ${sessionData.cookies?.length || 0} cookies`);
          } else {
            console.log('❌ ERROR: Session file NOT created!');
            process.exit(1);
          }
        }
      }

      const content1 = await client1.getArticleContent(testUrl, true);
      console.log(`✅ Got content: ${content1.length} characters\n`);

    } finally {
      // CRITICAL: Browser closes after operation (just like MCP server)
      console.log('🔒 Closing browser 1 (end of operation)');
      await client1.close();
    }

  } catch (error) {
    console.error('❌ Operation 1 failed:', error);
    process.exit(1);
  }

  console.log('\n⏱️  Waiting 2 seconds between operations...\n');
  await new Promise(resolve => setTimeout(resolve, 2000));

  // ========================================
  // SECOND OPERATION: get-article-content (should use session)
  // ========================================
  console.log('=== SECOND OPERATION: get-article-content (Should Use Session) ===\n');

  // Verify session file still exists
  if (!existsSync(sessionPath)) {
    console.log('❌ CRITICAL BUG: Session file disappeared!');
    process.exit(1);
  }
  console.log('✅ Session file exists before operation 2\n');

  try {
    // COMPLETELY NEW INSTANCE (just like MCP server does)
    const client2 = new BrowserMediumClient();

    try {
      // This is what withBrowserSession does
      await client2.initialize();
      console.log('✅ Browser 2 initialized (NEW instance)');

      const isValid2 = await client2.validateSessionFast();
      console.log(`Session validation: ${isValid2 ? '✅ Valid' : '❌ Invalid'}`);

      if (!isValid2) {
        console.log('\n⚠️  BUG DETECTED: Session exists but validation failed!');
        console.log('   This would cause re-login prompt.\n');

        const loginSuccess = await client2.ensureLoggedIn();
        console.log(`Re-login result: ${loginSuccess ? '✅ Success' : '❌ Failed'}`);
      } else {
        console.log('✅ Session valid - no re-login needed!\n');
      }

      const content2 = await client2.getArticleContent(testUrl, true);
      console.log(`✅ Got content: ${content2.length} characters\n`);

    } finally {
      console.log('🔒 Closing browser 2 (end of operation)');
      await client2.close();
    }

  } catch (error) {
    console.error('❌ Operation 2 failed:', error);
    process.exit(1);
  }

  console.log('\n✅ Test complete - check if re-login was required');
}

simulateMcpServerBehavior().catch(console.error);
