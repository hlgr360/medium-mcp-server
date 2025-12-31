import { BrowserMediumClient } from '../../src/browser-client';
import { existsSync } from 'fs';
import { join } from 'path';

async function testLogin() {
  console.log('🧪 Testing login detection with updated selectors...\n');

  const client = new BrowserMediumClient();
  const sessionPath = join(process.cwd(), 'medium-session.json');

  try {
    // Delete existing session to test fresh login
    if (existsSync(sessionPath)) {
      console.log('🗑️  Removing existing session file for fresh test...\n');
      const fs = require('fs');
      fs.unlinkSync(sessionPath);
    }

    // Initialize browser (will be visible since no session exists)
    console.log('🌐 Initializing browser...');
    await client.initialize(false); // Force non-headless for manual login

    // Test login detection
    console.log('🔐 Testing login detection...');
    console.log('📝 Please log in to Medium in the browser window');
    console.log('⏳ Waiting for login detection (up to 5 minutes)...\n');

    const success = await client.ensureLoggedIn();

    if (success) {
      console.log('\n✅ SUCCESS! Login was detected properly');

      // Check if session file was created
      if (existsSync(sessionPath)) {
        console.log('✅ Session file created successfully');

        // Read and display session info
        const fs = require('fs');
        const sessionData = JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
        console.log(`📊 Session contains ${sessionData.cookies?.length || 0} cookies`);
      } else {
        console.log('❌ ERROR: Session file was NOT created');
      }
    } else {
      console.log('\n❌ FAILED: Login was not detected');
    }

    console.log('\n🔒 Closing browser...');
    await client.close();
    console.log('✅ Test complete!');

  } catch (error) {
    console.error('\n❌ Test failed with error:', error);
    await client.close();
    process.exit(1);
  }
}

testLogin().catch(console.error);
