import { BrowserMediumClient } from './browser-client';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

async function testArticleReadFlow() {
  console.log('🧪 Testing article reading flow (simulating MCP tool behavior)...\n');

  const sessionPath = join(process.cwd(), 'medium-session.json');

  // Simulate fresh start (no session)
  console.log('=== Scenario 1: First Article Read (No Session) ===');
  if (existsSync(sessionPath)) {
    unlinkSync(sessionPath);
    console.log('🗑️  Deleted existing session for fresh test\n');
  }

  const client1 = new BrowserMediumClient();

  try {
    // Simulate what withBrowserSession() does
    console.log('📍 Step 1: Initialize browser (simulating withBrowserSession)');
    await client1.initialize();

    console.log('📍 Step 2: Validate session fast');
    const isValid1 = await client1.validateSessionFast();
    console.log(`   Result: ${isValid1 ? '✅ Valid' : '❌ Invalid'}`);

    if (!isValid1) {
      console.log('📍 Step 3: Session invalid, calling ensureLoggedIn()');
      console.log('   (Browser should open for login)\n');
      const loginSuccess = await client1.ensureLoggedIn();

      if (loginSuccess) {
        console.log('\n✅ Login successful, session should be saved');

        // Check if session file was created
        if (existsSync(sessionPath)) {
          console.log('✅ Session file exists!');
          const fs = require('fs');
          const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
          console.log(`📊 Session has ${sessionData.cookies?.length || 0} cookies\n`);
        } else {
          console.log('❌ ERROR: Session file was NOT created!\n');
        }
      }
    }

    await client1.close();
    console.log('🔒 Browser closed\n');

  } catch (error) {
    console.error('❌ Error in scenario 1:', error);
    await client1.close();
  }

  // Simulate second article read (should use saved session)
  console.log('\n=== Scenario 2: Second Article Read (Should Use Saved Session) ===');

  if (!existsSync(sessionPath)) {
    console.log('❌ No session file found - scenario 1 must have failed');
    process.exit(1);
  }

  const client2 = new BrowserMediumClient();

  try {
    console.log('📍 Step 1: Initialize browser (should load session)');
    await client2.initialize();

    console.log('📍 Step 2: Validate session fast');
    const isValid2 = await client2.validateSessionFast();
    console.log(`   Result: ${isValid2 ? '✅ Valid (no re-login needed!)' : '❌ Invalid (will need to re-login)'}`);

    if (!isValid2) {
      console.log('\n⚠️  BUG DETECTED: Session was saved but validation failed!');
      console.log('   This would cause re-login on every operation.\n');
    } else {
      console.log('\n✅ SUCCESS: Session persists correctly!');
      console.log('   No re-login needed for subsequent operations.\n');
    }

    await client2.close();
    console.log('✅ Test complete');

  } catch (error) {
    console.error('❌ Error in scenario 2:', error);
    await client2.close();
    process.exit(1);
  }
}

testArticleReadFlow().catch(console.error);
