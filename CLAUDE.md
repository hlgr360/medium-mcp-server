# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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
npx ts-node scripts/capture-fixtures.ts

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

### Testing Strategy

**Multi-Layered Approach**:

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

#### Fixture-Based Testing (NEW)

**Benefits**:
- ✅ **Fast**: ~100ms per test vs 30s E2E
- ✅ **No login required**: Account-independent
- ✅ **Deterministic**: HTML fixtures don't change
- ✅ **Edge cases**: Easy to test paywall, empty states

**Workflow**:
1. Login to Medium (creates session)
2. Run `npx ts-node scripts/capture-fixtures.ts`
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
| Login detection | `scripts/debug-login.ts` |
| Article retrieval | `scripts/debug-articles-detailed.ts` |
| Article publishing | `scripts/debug-editor-wait.ts` |
| Publish flow | `scripts/debug-publish-flow.ts` |
| Reading lists | `scripts/debug-lists-page.ts` |
| Individual list | `scripts/debug-single-list.ts` |

#### Step 2: Run Debug Script

```bash
npx ts-node scripts/debug-login.ts
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
npx ts-node scripts/test-get-articles-simple.ts

# Re-capture fixtures with new selectors
npx ts-node scripts/capture-fixtures.ts

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
