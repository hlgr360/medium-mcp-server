import { BrowserMediumClient } from './browser-client';
import { existsSync } from 'fs';
import { join } from 'path';

async function testOptimizedLogin() {
  console.log('🧪 Testing optimized login flow (redirect-based validation)...\n');

  const client = new BrowserMediumClient();
  const sessionPath = join(process.cwd(), 'medium-session.json');

  console.log('=== Scenario: With Valid Session ===');
  if (existsSync(sessionPath)) {
    console.log('✅ Session file exists');
  } else {
    console.log('❌ No session file - create one first with: node dist/test-login.js');
    process.exit(1);
  }

  try {
    await client.initialize(); // Use headless mode

    console.log('\n📍 Calling ensureLoggedIn()...');
    console.log('Expected behavior:');
    console.log('  1. Navigate to /m/signin');
    console.log('  2. Medium auto-redirects if logged in');
    console.log('  3. Check URL - if redirected, login valid!');
    console.log('  4. NO selector checking on homepage ⚡\n');

    const startTime = Date.now();
    const success = await client.ensureLoggedIn();
    const duration = Date.now() - startTime;

    console.log(`\n⏱️  Login check took: ${(duration / 1000).toFixed(1)} seconds`);

    if (success) {
      console.log('✅ Login validation successful!');
      console.log('   Benefits of optimized flow:');
      console.log('   - No homepage loading delay');
      console.log('   - No selector checking delay');
      console.log('   - Uses Medium\'s built-in redirect');
    } else {
      console.log('❌ Login validation failed');
    }

    await client.close();
    console.log('\n✅ Test complete');

  } catch (error) {
    console.error('\n❌ Test failed:', error);
    await client.close();
    process.exit(1);
  }
}

testOptimizedLogin().catch(console.error);
