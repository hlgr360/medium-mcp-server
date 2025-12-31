/**
 * Fixture Auto-Capture Helper
 *
 * Automatically captures fixtures if they don't exist before running fixture-based tests.
 * This provides a better developer experience by eliminating manual setup steps.
 */

import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const FIXTURES_DIR = join(__dirname, '..', 'fixtures');

const REQUIRED_FIXTURES = [
  'user-articles-page.html',
  'user-articles-empty.html',
  'reading-lists-page.html',
  'reading-lists-empty.html',
  'article-content-public.html',
  'feed-featured.html'
];

/**
 * Check if all required fixtures exist
 */
function fixturesExist(): boolean {
  return REQUIRED_FIXTURES.every(fixture =>
    existsSync(join(FIXTURES_DIR, fixture))
  );
}

/**
 * Capture fixtures by running the capture script
 */
function captureFixtures(): void {
  const sessionPath = join(__dirname, '..', '..', 'medium-session.json');

  // Check for session file first
  if (!existsSync(sessionPath)) {
    console.error('\n❌ Cannot capture fixtures: No Medium session found!\n');
    console.error('Please create a session first (one-time setup):');
    console.error('   npx ts-node scripts/test/test-login-flow.ts\n');
    console.error('Then run tests again. Fixtures will auto-capture using your session.\n');
    throw new Error('Medium session required for fixture capture');
  }

  console.log('\n📸 Fixtures not found. Auto-capturing from Medium...\n');
  console.log('Using existing session from medium-session.json');
  console.log('This is a one-time setup that takes ~30 seconds.\n');

  try {
    // Run the capture script synchronously
    execSync('npx ts-node scripts/utils/capture-fixtures.ts', {
      stdio: 'inherit', // Show output to user
      cwd: join(__dirname, '..', '..')
    });

    console.log('\n✅ Fixtures captured successfully!\n');
  } catch (error) {
    console.error('\n❌ Failed to capture fixtures.');
    console.error('Please run manually: npx ts-node scripts/utils/capture-fixtures.ts\n');
    throw error;
  }
}

/**
 * Ensure fixtures exist before running tests.
 * Call this in beforeAll() hook of fixture-based test files.
 *
 * @example
 * ```typescript
 * import { ensureFixtures } from '../helpers/ensure-fixtures';
 *
 * describe('Article Parser', () => {
 *   beforeAll(async () => {
 *     await ensureFixtures();
 *   });
 *
 *   // ... tests
 * });
 * ```
 */
export async function ensureFixtures(): Promise<void> {
  if (!fixturesExist()) {
    captureFixtures();
  }
}

/**
 * Check if fixtures exist (synchronous version for immediate checks)
 */
export function checkFixtures(): boolean {
  return fixturesExist();
}
