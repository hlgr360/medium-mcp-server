# AGENTS.md

This file provides guidance to AI coding assistants (Claude Code, GitHub Copilot, Cursor, etc.) when working with code in this repository.

## Table of Contents

- [Quick Start](#quick-start)
- [Project Overview](#project-overview)
- [User Guide](#user-guide)
  - [Configuration](#configuration)
  - [Available Tools](#available-tools)
  - [Session Management](#session-management)
- [Developer Guide](#developer-guide)
  - [Development Commands](#development-commands)
  - [Architecture](#architecture)
  - [Testing Strategy](#testing-strategy)
  - [Debugging Workflow](#debugging-workflow)
  - [Development Guidelines](#development-guidelines)
- [Reference](#reference)
  - [Current Selectors](#current-selectors)
  - [Debug Scripts](#debug-scripts)
  - [Test Commands](#test-commands)
- [Known Limitations](#known-limitations)

---

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Install browser
npx playwright install chromium

# 3. Build project
npm run build

# 4. Run tests
npm run test:all

# 5. Start server (for Claude Desktop)
npm start
```

**First-time setup for Claude Desktop**: See [Configuration](#configuration)

---

## Project Overview

Medium MCP Server is a browser-based automation solution for programmatically interacting with Medium's content ecosystem. Since Medium discontinued their public API for new users, this server uses Playwright browser automation to provide content management through the Model Context Protocol (MCP).

**Key Points**:
- ✅ AI-developed workaround for Medium's deprecated API
- ✅ All functionality via Playwright browser automation
- ✅ Session persistence to minimize login requirements
- ✅ Stealth mode to bypass bot detection
- ⚠️ Browser automation = slower than API (10-30s per operation)
- ⚠️ Dependent on Medium's UI structure (selectors may break)

---

## User Guide

### Configuration

Add to Claude MCP settings (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "medium-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/medium-mcp-server/dist/index.js"]
    }
  }
}
```

**Critical Requirements**:
- ✅ Use **absolute paths only** (no `~/` or relative paths)
- ✅ Example: `"/Users/yourusername/repos/medium-mcp-server/dist/index.js"`
- ❌ Do NOT use `cwd` parameter (unreliable in Claude Desktop)

**Why**: Claude Desktop may run with `cwd=/` (root), which is read-only on macOS and causes session save failures.

### Available Tools

The server provides 8 MCP tools:

| Tool | Description | Requires Login |
|------|-------------|----------------|
| `login-to-medium` | Manually trigger login (opens browser) | N/A |
| `publish-article` | Create article drafts (draft-only) | ✅ |
| `get-my-articles` | Retrieve user's articles with status | ✅ |
| `get-article-content` | Extract content from any article URL | Optional* |
| `search-medium` | Search Medium by keywords | Optional* |
| `get-feed` | Retrieve feed articles (Featured/For You/Following/All) | ✅ |
| `get-lists` | Retrieve user's reading lists | ✅ |
| `get-list-articles` | Retrieve articles from a specific list | ✅ |

*Works without login but may get limited/paywalled content

### Session Management

**How It Works**:
1. **First Use**: Call `login-to-medium` → Browser opens → You log in → Session saved to `medium-session.json`
2. **Subsequent Uses**: Session auto-loaded → Browser runs headless → No login required ✅
3. **Expiry**: Session validated before each operation → Re-login triggered if expired

**Session File**: `medium-session.json` (gitignored, stored in project root)

**Session Validation**:
- Fast redirect check (5s) before each operation
- Auto-detects expired cookies
- Auto-switches between headless/visible modes

**Login Preferences**:
- ✅ **Recommended**: Email/password login
- ⚠️ **Avoid**: Google OAuth (session persistence issues)

---

## Developer Guide

### Development Commands

#### Build & Run

```bash
npm install              # Install dependencies
npm run build            # Build TypeScript
npm start                # Start MCP server (production)
npm run dev              # Development mode with auto-reload
```

#### Testing

```bash
# Jest (unit + integration + fixtures)
npm run test:unit                    # All Jest tests (93 tests)
npm run test:unit:watch              # Watch mode
npm run test:unit:coverage           # With coverage report

# Playwright (E2E)
npm test                             # All E2E tests (56 tests)
npm run test:headed                  # Visible browser
npm run test:ui                      # Playwright UI
npm run test:report                  # View HTML report

# Combined
npm run test:all                     # Jest + Playwright (149 tests)
```

#### Fixture Management

```bash
# Capture HTML snapshots (requires login)
npx ts-node scripts/utils/capture-fixtures.ts

# Run fixture-based tests
npm run test:unit -- tests/integration/
```

### Architecture

**Core Components**:

1. **`index.ts`** - MCP Server
   - Registers 8 tools with Zod validation
   - Handles stdio transport and lifecycle
   - Error wrapping: `{ isError: true, content: [...] }`

2. **`browser-client.ts`** - Browser Automation
   - Playwright-based automation engine
   - Session persistence (`medium-session.json`)
   - Anti-detection (stealth mode)
   - Multiple fallback selectors

3. **`tests/parsers/`** - Standalone Parsing Modules (NEW)
   - Extract parsing logic for testability
   - Work with HTML strings via linkedom
   - Enable fixture-based testing

**Legacy Files (Unused)**:
- `auth.ts`, `client.ts` - Old API implementations, DO NOT USE

For detailed architecture, see [ARCHITECTURE.md](./ARCHITECTURE.md)

### Development Conventions

This project follows standardized conventions for logging, testing, and TypeScript that can be reused across projects:

📘 **[Logging Best Practices](./docs/conventions/LOGGING.md)** - Custom Logger class with semantic log levels, stderr routing for MCP protocol safety, automatic test suppression

📘 **[Testing Best Practices](./docs/conventions/TESTING.md)** - Multi-layered testing strategy, coverage philosophy, fixture-based testing patterns

📘 **[TypeScript Best Practices](./docs/conventions/TYPESCRIPT.md)** - Type safety guidelines, eliminating `any` types, strict mode configuration

**Quick Reference - Log Levels**:
- **TRACE** 🔍: Extremely detailed diagnostics (DOM selectors, redirects)
- **DEBUG** 🐛: Operation progress (diagnostics blocks, navigation)
- **INFO** ℹ️: User-facing messages (operation start/complete)
- **WARN** ⚠️: Warnings (session expired, timeouts)
- **ERROR** ❌: Actual errors (catch blocks, failures)

See [docs/conventions/LOGGING.md](./docs/conventions/LOGGING.md) for complete logging documentation.

### Testing Strategy (Project-Specific)

**See [docs/conventions/TESTING.md](./docs/conventions/TESTING.md) for general testing best practices.**

This section covers project-specific test organization, counts, and workflows.

**Current Test Coverage**:

| Layer | Technology | Count | Speed | Purpose |
|-------|-----------|-------|-------|---------|
| Unit | Jest | 29 | ~1s | Pure logic, validation |
| Integration (Mocks) | Jest + Mocks | 53 | ~1.5s | BrowserMediumClient methods |
| Integration (Fixtures) | Jest + linkedom | 31 | ~0.3s | Parsing with HTML snapshots |
| E2E | Playwright | 56 | ~6min | Full browser automation |
| **Total** | | **149** | **~6min** | |

**Test Organization**:

```
src/__tests__/          # Jest tests with mocks (82 tests)
├── unit/               # Pure logic (29 tests)
├── integration/        # Mocked Playwright (53 tests)
└── helpers/            # Test utilities

tests/                  # Fixture-based & E2E (67 tests)
├── parsers/            # Standalone parsing modules (NEW)
├── fixtures/           # HTML snapshots (NEW)
├── integration/        # Fixture-based tests (31 tests, NEW)
└── *.spec.ts           # Playwright E2E tests (36 tests)
```

**Coverage**: ~47% overall (appropriate for browser automation)
- ✅ Core logic: >80% (session, validation, lifecycle)
- ⚠️ UI automation: 30-40% (DOM parsing, selectors)

**Why Not 80%+**: DOM selector strategies have 100+ fallback branches; testing mocked selectors provides little value. E2E tests validate UI automation better.

#### Test Session Setup

**Automated One-Time Login** (via `globalSetup`):

Playwright automatically runs `scripts/utils/setup-test-session.ts` before all tests to ensure a valid Medium session exists:

1. **First run** (no session file):
   - Opens browser visibly for manual login
   - User logs in to Medium (5-minute timeout)
   - Session saved to `medium-session.json`
   - All subsequent test runs are headless

2. **Subsequent runs** (valid session exists):
   - Validates existing session (cookie expiry check)
   - Skips login prompt entirely
   - All tests run headless immediately

3. **Expired session**:
   - Detects expired cookies
   - Opens browser for re-login
   - Updates session file

**Session File Management**:
- **Main session**: `medium-session.json` (used by most tests, persisted across runs)
- **Test sessions**: `medium-session.test.json` (used by session-management tests, cleaned up after each test)

**Why This Approach**:
- ✅ No needless browser popups during regular test runs
- ✅ Full test coverage maintained (not disabled)
- ✅ Session automatically reused across test runs
- ✅ One-time setup, then always headless
- ✅ Test-specific session files don't interfere with main session

**Skipped Tests** (only tests that specifically require visible browser):
- `browser-lifecycle.spec.ts` - "should use non-headless mode when forced" (run with `HEADED_MODE_TEST=true`)
- `authentication.spec.ts` - "ensureLoggedIn should handle timeout gracefully" (requires 5+ min manual interaction)

#### Fixture-Based Testing (NEW)

**Benefits**:
- ✅ **Fast**: ~100ms per test vs 30s E2E
- ✅ **No login required**: Account-independent
- ✅ **Deterministic**: HTML fixtures don't change
- ✅ **Edge cases**: Easy to test paywall, empty states

**Workflow**:
1. Login to Medium (creates session)
2. Run `npx ts-node scripts/utils/capture-fixtures.ts`
3. Fixtures saved to `tests/fixtures/`
4. Tests use parsers in `tests/parsers/` with fixtures

**When to Update**:
- After fixing selectors (UI changes)
- When E2E tests fail (fixtures stale)
- Adding edge case tests
- Fixtures >6 months old

**Privacy**: Fixtures may contain personal data (article titles, list names). For public repos, use test account or add to `.gitignore`.

### Debugging Workflow

**When Medium UI Changes Break Selectors**:

#### Step 1: Identify Issue

| Broken Feature | Debug Script |
|----------------|--------------|
| Login detection | `scripts/debug/debug-login.ts` |
| Article retrieval | `scripts/debug/debug-articles-detailed.ts` |
| Article publishing | `scripts/debug/debug-editor-wait.ts` |
| Publish flow | `scripts/debug/debug-publish-flow.ts` |
| Reading lists | `scripts/debug/debug-lists-page.ts` |
| Individual list | `scripts/debug/debug-single-list.ts` |

#### Step 2: Run Debug Script

```bash
npx ts-node scripts/debug/debug-login.ts
# Opens browser, outputs selector analysis, saves screenshots
```

#### Step 3: Analyze Output

- Look for `data-testid` attributes (most stable)
- Check `aria-label`, button text, role attributes
- Note class names (least stable, fallback only)
- Review screenshots in project root

#### Step 4: Update Selectors

```typescript
// In browser-client.ts - ADD to fallback array, don't replace
const selectors = [
  '[data-testid="newSelector"]',  // NEW - add first
  '[data-testid="oldSelector"]',  // OLD - keep as fallback
  'button[aria-label*="user"]'    // GENERIC - always keep
];
```

Add comment: `// Updated Dec 2025 - Medium changed UI`

#### Step 5: Test & Update Fixtures

```bash
# Test the fix
npx ts-node scripts/test/test-get-articles-simple.ts

# Re-capture fixtures with new selectors
npx ts-node scripts/utils/capture-fixtures.ts

# Run fixture tests
npm run test:unit -- tests/integration/

# Run E2E tests
npm test
```

#### Step 6: Update Documentation

- Update selector list in [Reference](#reference) section
- Update ARCHITECTURE.md if needed
- Add entry to git commit message

### Development Guidelines

**Adding New Tools**:
- Follow pattern in `index.ts` (Zod schema, error wrapping)
- Add both unit tests (mocks) and E2E tests
- Consider adding fixture-based tests for parsing logic

**Updating Selectors**:
- Add to fallback arrays (don't replace)
- Prefer `data-testid` > `aria-label` > class names
- Test with visible browser first (`npm run test:headed`)
- Update fixtures after confirming fix

**Updating CHANGELOG.md** (REQUIRED):
- **ALWAYS** update CHANGELOG.md for significant changes
- Add entry to `[Unreleased]` section immediately after making changes
- Use appropriate category: Added, Changed, Fixed, Security, etc.
- Write from user perspective (what changed, why it matters)
- See [CONTRIBUTING.md](./CONTRIBUTING.md#changelog-maintenance) for complete guidelines

**When to update CHANGELOG**:
- ✅ New features (new MCP tools, significant functionality)
- ✅ Bug fixes (user-facing issues resolved)
- ✅ Breaking changes (API changes, required migration)
- ✅ Security fixes (vulnerabilities patched)
- ❌ Internal refactoring (unless affects performance)
- ❌ Test additions (unless enabling new testing patterns)

**Example CHANGELOG entry**:
```markdown
### Added
- Added `get-publication-articles` tool to retrieve articles from Medium publications

### Fixed
- Fixed login detection failing when `data-testid` attribute missing (Medium UI change Dec 2025)
```

**⚠️ Assessing Fragility** (CRITICAL):

Before implementing new features, assess risk:

| Risk Level | Indicators | Action |
|------------|-----------|--------|
| 🔴 **High** | Modal popups, generated class names (`.xyz123`), multi-step UI flows | Warn user, consider alternatives |
| 🟡 **Medium** | No `data-testid`, relies on button text, mobile/desktop differences | Implement with extensive fallbacks |
| 🟢 **Low** | Stable `data-testid`, consistent DOM structure | Safe to implement |

**Example**: The `toggle-article-save` tool was rolled back due to modal checkbox detection with unstable selectors.

**Best Practices**:
- Browser automation is inherently fragile
- Medium changes UI frequently
- Plan for maintenance overhead
- Use E2E tests to catch breakage early

---

## Reference

### Current Selectors

**Login Indicators** (v1.2+):
```typescript
'[data-testid="headerUserIcon"]'
'[data-testid="headerWriteButton"]'
'[data-testid="headerNotificationButton"]'
'button[aria-label*="user"]'
```

**Article List** (v1.2+):
```typescript
'table tbody tr'  // Container
'h2'              // Title
'a[href*="/p/"][href*="/edit"]'  // Draft links
'a[href*="/@"]'   // Published links
```

**Article Editor** (v1.2+):
```typescript
'[data-testid="editorTitleParagraph"]'   // Title field
'[data-testid="editorParagraphText"]'    // Content field
```

**Reading Lists** (v1.3.0+):
```typescript
'[data-testid="readingList"]'   // Primary
'a[href*="/list/"]'             // Fallback
```

**Feed Articles** (v1.3.0+):
```typescript
'article'                        // Container
'[data-testid="story-preview"]'  // Alternative container
'h1', 'h2', 'h3'                // Title
```

### Debug Scripts

**Analysis Scripts** (open browser, output details):

| Script | Purpose | Output |
|--------|---------|--------|
| `debug-login.ts` | Login page selectors | Console + screenshot |
| `debug-articles-detailed.ts` | Article list DOM | Console analysis |
| `debug-editor-wait.ts` | Editor selectors (15s wait) | Contenteditable elements |
| `debug-publish-flow.ts` | Publish flow selectors | All editor elements |
| `debug-lists-page.ts` | Lists page structure | All list elements |
| `debug-single-list.ts` | Individual list navigation | URL validation |

**Test Scripts** (validate fixes):

| Script | Purpose |
|--------|---------|
| `test-get-articles-simple.ts` | Quick article retrieval test |
| `test-get-lists.ts` | List retrieval with details |
| `test-list-articles.ts` | List article retrieval |
| `test-feed-all.ts` | Feed retrieval (all categories) |
| `test-publish-article.ts` | Draft creation with tags |
| `test-login-flow.ts` | Login detection |

### Test Commands

**Quick Reference**:

```bash
# Unit tests only
npm run test:unit -- src/__tests__/unit/

# Integration tests (mocks)
npm run test:unit -- src/__tests__/integration/

# Fixture-based tests (NEW)
npm run test:unit -- tests/integration/

# E2E tests
npm test

# Specific test file
npm run test:unit -- src/__tests__/unit/validation.test.ts

# All tests
npm run test:all
```

**Test Counts**:
- Jest: 93 tests (29 unit + 53 integration w/ mocks + 11 fixture-based)
- Playwright: 56 tests (E2E)
- **Total**: 149 tests

**Session Management Tests** (Optimized):
- Reduced logins: 3 → **1** ✅
- Save/restore pattern preserves session
- Subsequent test suites reuse session
- Test time: 8 tests in ~37s (was 9 tests in ~66s)

---

## Common Pitfalls

### Critical Mistakes to Avoid

**Import Paths After File Moves** 🔴 **CRITICAL**:
```typescript
// ❌ BROKEN - File moved to subdirectory but import not updated
// In scripts/debug/debug-login.ts:
import { BrowserMediumClient } from '../src/browser-client';

// ✅ FIXED - Correct relative path from subdirectory
import { BrowserMediumClient } from '../../src/browser-client';
```

**Rule**: Count directory depth:
- `scripts/` → 1 level → `../src/`
- `scripts/debug/` → 2 levels → `../../src/`
- `scripts/test/` → 2 levels → `../../src/`

**History**: Affected 21 files in commit `55b6914` after script reorganization

---

**Logging** ❌ **Don't use console.log**:
```typescript
// ❌ BAD - Pollutes MCP stdout, breaks protocol
console.log('Publishing article...');

// ✅ GOOD - Use Logger with semantic level
logger.info('Publishing article...');
logger.debug('Navigated to editor page');
logger.trace('Trying selector:', selector);
```

**Why**: MCP protocol uses stdout for JSON-RPC. All logs must go to stderr via Logger.

---

**Selectors** ❌ **Don't use single selectors**:
```typescript
// ❌ BAD - Breaks when Medium changes UI
await page.click('[data-testid="publishButton"]');

// ✅ GOOD - Fallback array survives UI changes
const selectors = [
  '[data-testid="publishButton"]',     // Primary
  '[data-testid="publishStoryButton"]', // Alternative
  'button:has-text("Publish")'          // Generic
];
for (const selector of selectors) {
  const btn = await page.$(selector);
  if (btn) {
    await btn.click();
    break;
  }
}
```

**Rule**: Always use 3+ fallback selectors, prioritize `data-testid` > `aria-label` > text

---

**Fixtures** ❌ **Don't skip fixture updates**:
```bash
# ❌ BAD - Change selectors but don't update fixtures
# Result: Fixture tests pass but E2E tests fail (stale fixtures)

# ✅ GOOD - Update fixtures after selector changes
npx ts-node scripts/utils/capture-fixtures.ts
npm run test:unit -- tests/integration/
```

**When to update**:
- After fixing selectors due to Medium UI changes
- When E2E tests fail but fixture tests pass
- Every 3-6 months as preventive maintenance

---

**Testing** ❌ **Don't commit with warnings**:
```bash
# ❌ BAD - Tests pass but have warnings
npm test
# ⚠ Warning: Deprecated function used
# ✅ 149 tests passing

# ✅ GOOD - Zero warnings
npm test
# ✅ 149 tests passing (no warnings)
```

**Zero warnings requirement**: All tests must run without deprecation warnings, unused import warnings, or resource warnings

---

**CHANGELOG** ❌ **Don't forget to update**:
```bash
# ❌ BAD - Commit changes without CHANGELOG entry
git commit -m "feat: add publications support"

# ✅ GOOD - Update CHANGELOG.md first
# Add to [Unreleased] section:
# ### Added
# - Added support for Medium publications with `get-publication-articles` tool

git add CHANGELOG.md src/
git commit -m "feat: add publications support"
```

**Rule**: ALWAYS update CHANGELOG.md for user-facing changes (see [CONTRIBUTING.md](./CONTRIBUTING.md#changelog-maintenance))

---

**Git Workflow** ❌ **Don't commit to main**:
```bash
# ❌ BAD - Direct commit to main
git checkout main
git commit -m "feat: add new feature"
git push

# ✅ GOOD - Feature branch + PR
git checkout -b feature/add-new-feature
git commit -m "feat: add new feature"
git push origin feature/add-new-feature
# Then create PR on GitHub
```

**Rule**: NEVER commit directly to main. Always use feature branches.

---

**ADRs** ❌ **Don't modify existing ADRs**:
```bash
# ❌ BAD - Edit existing ADR
vim docs/adr/001-fixture-tests.md
# (change decision content)

# ✅ GOOD - Create new ADR that supersedes
vim docs/adr/015-migrate-from-fixtures.md
# Status: Accepted
# Supersedes: ADR-001

# Update old ADR status only:
# Status: Superseded by ADR-015
```

**Rule**: ADRs are historical records. Never modify content, only status. Create new ADR to supersede.

---

**Error Handling** ❌ **Don't swallow errors**:
```typescript
// ❌ BAD - Silent failure
try {
  await client.getArticles();
} catch {}

// ✅ GOOD - Log and re-throw or wrap
try {
  await client.getArticles();
} catch (error) {
  logger.error('Failed to get articles:', error);
  throw new Error(`Article retrieval failed: ${error.message}`);
}
```

**Rule**: Always handle errors with context. For MCP tools, wrap in `{ isError: true, content: [...] }`

---

**Over-Engineering** ❌ **Don't add unnecessary features**:
```typescript
// ❌ BAD - User asked for simple feature, you add configuration, caching, etc.
interface GetArticlesOptions {
  cache?: boolean;
  timeout?: number;
  retries?: number;
  fallback?: Article[];
}

// ✅ GOOD - Implement exactly what was requested
async getArticles(): Promise<Article[]> {
  // Simple implementation
}
```

**Rule**: Only implement what's requested. Don't add "nice to have" features without asking.

---

### Quick Reference Card

| Pitfall | Wrong ❌ | Right ✅ |
|---------|---------|----------|
| Import paths | `../src/` in subdirectory | `../../src/` (count depth) |
| Logging | `console.log()` | `logger.info()` |
| Selectors | Single selector | Array with 3+ fallbacks |
| Fixtures | Don't update | Update after selector changes |
| Testing | Warnings OK | Zero warnings required |
| CHANGELOG | Skip updating | Always update [Unreleased] |
| Git | Commit to main | Feature branch + PR |
| ADRs | Modify existing | Supersede with new ADR |
| Errors | Swallow silently | Log with context |
| Features | Over-engineer | Implement only what's asked |

---

## Known Limitations

- ⏱️ **Speed**: 10-30s per operation (browser automation overhead)
- 🔄 **Browser Lifecycle**: Fresh launch per operation (5-10s startup)
- 🎭 **Stealth Mode**: Uses `playwright-extra` + stealth plugin (v1.2+) to bypass Cloudflare
- 🔧 **Selector Fragility**: Medium UI changes break selectors frequently
- 🔐 **Google Login**: Email/password preferred; Google OAuth has session issues
- ✏️ **Write Operations**: Draft creation only (no publish, no editing existing articles)
- 🌐 **Content Access**: Works without login but gets paywalled/preview content

**Browser Automation Reality**:
- Not as reliable as APIs
- Requires ongoing maintenance
- Medium changes UI frequently
- Plan for selector breakage

---

## Additional Resources

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Detailed technical architecture
- [README.md](./README.md) - User documentation
- [tests/fixtures/README.md](./tests/fixtures/README.md) - Fixture usage guide
