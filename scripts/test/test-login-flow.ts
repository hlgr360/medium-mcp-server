import { BrowserMediumClient } from '../../src/browser-client';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';

async function testLoginFlow() {
  console.log('🧪 Testing improved login flow...\n');

  const client = new BrowserMediumClient();
  const sessionPath = join(process.cwd(), 'medium-session.json');

  // Test 1: Fresh login (no session file)
  console.log('=== TEST 1: Fresh Login (No Session File) ===');
  if (existsSync(sessionPath)) {
    unlinkSync(sessionPath);
    console.log('✅ Deleted existing session file');
  }

  try {
    await client.initialize(false); // Non-headless for visibility

    console.log('📍 Starting ensureLoggedIn()...');
    console.log('⏱️  Expected: Should go DIRECTLY to login page (no delay)\n');

    // Don't actually complete the login, just watch the navigation
    setTimeout(() => {
      console.log('\n✅ Test complete - verify that browser went directly to /m/signin');
      console.log('   (No delay on Medium homepage)');
      process.exit(0);
    }, 10000);

    await client.ensureLoggedIn();

  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

testLoginFlow().catch(console.error);
