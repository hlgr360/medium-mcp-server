import { BrowserMediumClient } from '../../src/browser-client';
import { existsSync } from 'fs';
import { join } from 'path';

/**
 * Playwright globalSetup script
 *
 * Ensures a valid Medium session exists before running tests.
 * - If valid session exists: exits immediately
 * - If no session or expired: opens browser for manual login (ONE TIME ONLY)
 * - After initial setup: all tests run headless using saved session
 */
async function setupTestSession() {
  const sessionPath = join(__dirname, '..', 'medium-session.json');
  const client = new BrowserMediumClient();

  console.error('');
  console.error('═══════════════════════════════════════════════════════');
  console.error('🔧 TEST SESSION SETUP');
  console.error('═══════════════════════════════════════════════════════');

  // Check if valid session already exists
  const hasValidSession = await client.preValidateSession();

  if (hasValidSession) {
    console.error('✅ Valid session found - tests will run headless');
    console.error('═══════════════════════════════════════════════════════');
    console.error('');
    return;
  }

  // No valid session - need to create one
  if (!existsSync(sessionPath)) {
    console.error('⚠️  No session file found');
  } else {
    console.error('⚠️  Session file exists but cookies are expired');
  }

  console.error('');
  console.error('📋 INITIAL SETUP REQUIRED');
  console.error('   A browser will open for you to log in to Medium.');
  console.error('   This is a ONE-TIME setup.');
  console.error('   After login, all tests will run headless.');
  console.error('');
  console.error('   Please log in within 5 minutes...');
  console.error('');

  try {
    // Initialize browser in non-headless mode for login
    await client.initialize(false); // false = visible browser

    // Trigger login flow (will wait up to 5 minutes)
    const loginSuccess = await client.ensureLoggedIn();

    if (loginSuccess) {
      console.error('');
      console.error('✅ Login successful! Session saved.');
      console.error('✅ All subsequent test runs will be headless.');
      console.error('═══════════════════════════════════════════════════════');
      console.error('');
    } else {
      console.error('');
      console.error('❌ Login failed or timed out.');
      console.error('   Please run: npm test');
      console.error('   And try logging in again.');
      console.error('═══════════════════════════════════════════════════════');
      console.error('');
      process.exit(1);
    }

    await client.close();
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('');
    console.error('❌ Setup failed:', message);
    console.error('═══════════════════════════════════════════════════════');
    console.error('');
    await client.close();
    process.exit(1);
  }
}

export default setupTestSession;
