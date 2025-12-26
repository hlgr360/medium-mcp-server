# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Medium MCP Server is a browser-based automation solution for programmatically interacting with Medium's content ecosystem. Since Medium discontinued their public API for new users, this server uses Playwright browser automation to provide content management through the Model Context Protocol (MCP).

**Key Point**: This project was AI-developed and uses browser automation as a workaround for Medium's deprecated API. The codebase contains legacy API code (`auth.ts`, `client.ts`) that is **unused** - only the browser automation implementation is active.

## Common Development Commands

### Build and Run
```bash
# Install dependencies
npm install

# Install Playwright browser (required for automation)
npx playwright install chromium

# Build the TypeScript project
npm run build

# Start the MCP server (production)
npm start

# Development mode with auto-reload
npm run dev
```

### Testing

#### End-to-End Tests (Playwright)
```bash
# Run all E2E tests with Playwright Test
npm test

# Run tests with visible browser
npm run test:headed

# Open Playwright Test UI for debugging
npm run test:ui

# View HTML test report
npm run test:report
```

**E2E Test Coverage**:
- **Session Management**: Cookie validation, session persistence, expiry detection
- **Browser Lifecycle**: Initialize/close cycles, headless mode switching
- **Authentication**: Fast session validation, login timeout handling

#### Unit/Integration Tests (Jest)
```bash
# Run all Jest tests
npm run test:unit

# Run tests in watch mode
npm run test:unit:watch

# Generate coverage report
npm run test:unit:coverage

# Run all tests (Jest + Playwright)
npm run test:all
```

**Jest Test Coverage**:
- **Unit Tests (29)**: Cookie validation, expiry detection, headless mode logic
- **Integration Tests (53)**: BrowserMediumClient methods with mocked Playwright, MCP tool handlers
- **Total**: 82 tests, ~47% code coverage
- **Coverage**: Session management, browser lifecycle, validation logic, tool handlers

## Architecture

### Core Components

1. **index.ts** - MCP Server Entry Point
   - Implements `MediumMcpServer` class that orchestrates the entire server
   - Registers 5 MCP tools: `publish-article`, `get-my-articles`, `get-article-content`, `search-medium`, `login-to-medium`
   - Handles server lifecycle (initialization, graceful shutdown via SIGINT/SIGTERM)
   - Uses stdio transport for MCP communication
   - Error handling pattern: All tool handlers wrap errors in `isError: true` response format

2. **browser-client.ts** - Browser Automation Engine
   - Implements `BrowserMediumClient` class using Playwright
   - **Session Management**: Saves/loads login sessions from `medium-session.json` in project root
   - **Anti-Detection**: Configures browser to bypass automation detection (removes webdriver property, custom user agent)
   - **Login Flow**: Opens browser for initial login, then runs headless with saved session
   - **Selector Strategy**: Uses multiple fallback selectors for robustness against Medium UI changes
   - Key methods:
     - `ensureLoggedIn()`: Checks session validity with multiple login indicators, triggers interactive login if needed (5-minute timeout)
     - `publishArticle()`: Navigates to `/new-story`, fills editor, handles draft/publish
     - `getUserArticles()`: Scrapes user's Medium stories from `/me/stories/public`
     - `getArticleContent()`: Extracts article text with fallback strategies, detects paywalls
     - `searchMediumArticles()`: Searches Medium and extracts result articles

3. **Legacy Files (Unused)**
   - `auth.ts`: Old OAuth implementation for deprecated Medium API
   - `client.ts`: Old REST API client - DO NOT USE

### Data Flow

```
MCP Client (Claude)
  ↓ stdio transport
MediumMcpServer (index.ts)
  ↓ tool invocation
BrowserMediumClient (browser-client.ts)
  ↓ Playwright automation
Chromium Browser → Medium Website
  ↓ DOM manipulation
Response → JSON → MCP Client
```

### Session Persistence

**Overview**: The server implements robust session persistence to avoid repeated logins across tool invocations.

**Session File**: `medium-session.json` (gitignored)
- **Location**: Project root directory
- **Contents**: Cookies and localStorage state from Medium.com
- **Format**: JSON file compatible with Playwright's `storageState()` API

**Lifecycle**:
1. **First Use**: User calls `login-to-medium` tool → Browser opens visibly → User logs in → Session saved
2. **Subsequent Uses**: Browser loads session → Validates cookies → Auto-switches to headless mode
3. **Expiry**: Session validation detects expired cookies → Triggers re-login automatically

**Cookie Validation**:
- `validateStorageState()`: Pre-checks cookie expiration timestamps before browser launch
- Validates Medium-specific auth cookies (sid, uid, session)
- Rejects sessions with any expired authentication cookies
- Logs expiry dates for debugging

**Session Validation**:
- `validateSessionFast()`: Fast HTTP redirect check (5s vs old 21s DOM selector method)
- Navigates to `https://medium.com/me` and checks for redirect to login page
- Much faster than fragile DOM selector-based validation

**Login Flow Optimization (v1.2, Dec 2025)**:
- **Smart login check**: Always navigates to `/m/signin` first (regardless of session status)
  - If already logged in → Medium auto-redirects to homepage (session valid!)
  - If not logged in → Stays on `/m/signin` (ready for login)
- **Benefits**:
  - No delay checking selectors on homepage (was 10-20 seconds)
  - Works for both fresh login AND expired session re-login
  - Single navigation instead of homepage → check → login page
  - Uses Medium's built-in redirect behavior for validation

**Headless Mode**:
- Browser automatically uses headless mode when valid session exists
- Non-headless mode only for initial login and when `login-to-medium` is called
- Configurable via `initialize(forceHeadless?: boolean)` parameter

### Error Handling Patterns

- Tools return `{ isError: true, content: [...] }` on failure
- Browser operations use try-catch with fallback selectors
- Login timeout: 300 seconds (5 minutes)
- Page load: waits for 'networkidle' state
- Graceful degradation: search and article fetch work without login (limited content)

## Configuration for Claude Desktop

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

**Important Configuration Notes:**
- **Use absolute paths only** - Do NOT use `~/` or relative paths
- **Example:** `"/Users/yourusername/repos/medium-mcp-server/dist/index.js"`
- **Do NOT use `cwd` parameter** - It's not reliable in Claude Desktop (working directory may be `/`)
- **Session file location:** Automatically stored in project root as `medium-session.json`
- **Why this matters:** The server was failing to save sessions because Claude Desktop runs with `cwd=/` (root directory, which is read-only on macOS)

## Important Notes

### Browser Automation Considerations

- **Speed**: Operations take 10-30 seconds (browser automation overhead). Browser launches fresh for each tool invocation and closes afterward.
- **Browser Lifecycle**: Browser is NOT persistent - it opens for each operation and closes when done. This saves resources but adds 5-10s startup time per operation.
- **Stealth Mode (v1.2+)**: Uses `playwright-extra` with `puppeteer-extra-plugin-stealth` to bypass bot detection (Cloudflare, etc.) in headless mode
  - Masks automation fingerprints (webdriver, navigator properties, WebGL/Canvas)
  - Allows reliable headless operation without being blocked
- **Selector Fragility**: Medium UI changes will break selectors - use multiple fallback strategies
  - **Latest Updates (v1.2, Dec 2025)**:
    - **Login indicators**: `headerUserButton` → `headerUserIcon`, `write-button` → `headerWriteButton`, added `headerNotificationButton`
    - **Article list (getUserArticles)**: Complete rewrite for new Medium layout
      - **Old approach**: `[data-testid="story-preview"]` selector (REMOVED by Medium)
      - **New approach**: Tab-based scraping with smart detection
        - Parses tab names to find article counts: "Drafts1", "Published2", etc.
        - Only scrapes tabs with articles (skips empty tabs)
        - Handles dual link formats: Edit links `/p/{id}/edit` (drafts) vs public links `/@user/slug-{id}` (published)
        - Tags each article with status: `draft`, `published`, `unlisted`, `scheduled`, `submission`
    - **Article editor (publishArticle)**: Updated for new Medium editor selectors
      - **Old approach**: `[data-testid="richTextEditor"]` selector (REMOVED by Medium)
      - **New selectors**: Title: `[data-testid="editorTitleParagraph"]`, Content: `[data-testid="editorParagraphText"]`
      - **Debugging**: Use `scripts/debug-editor-wait.ts` to analyze editor DOM structure
  - **Debugging UI Changes**: Use `scripts/debug-login.ts` and `scripts/debug-articles*.ts` to analyze page structure
- **Google Login Issues**: Email/password login preferred; Google OAuth may have session persistence issues
- **Headless Mode**: Browser auto-switches to headless mode after initial login. Non-headless only for `login-to-medium` tool.
- **Session Validation**: Fast validation check (5s) runs before each operation to ensure session is still valid

### Development Guidelines

- **When adding new tools**: Follow the pattern in index.ts (Zod schema validation, error wrapping)
- **When updating selectors**: Add new selectors to fallback arrays, don't replace existing ones
  - **Current login selectors (v1.2)**: `[data-testid="headerUserIcon"]`, `[data-testid="headerWriteButton"]`, `[data-testid="headerNotificationButton"]`, `button[aria-label*="user"]`
  - **Current article list selectors (v1.2)**: `table tbody tr` containing `h2` and `a[href*="/p/"][href*="/edit"]`
  - **Current editor selectors (v1.2)**: Title: `[data-testid="editorTitleParagraph"]`, Content: `[data-testid="editorParagraphText"]`
  - **Debugging selector changes**:
    - Login page: `npx ts-node scripts/debug-login.ts`
    - Articles page: `npx ts-node scripts/debug-articles.ts` or `npx ts-node scripts/debug-articles-detailed.ts`
    - Editor page: `npx ts-node scripts/debug-editor-wait.ts`
    - Test extraction: `npx ts-node scripts/test-get-articles-simple.ts`
- **Session debugging**: Delete `medium-session.json` to force re-login
- **Console logging**: Use `console.error()` for debugging (stdout reserved for MCP JSON protocol)
- **Browser context**: Silent logging in `page.evaluate()` to avoid JSON serialization issues

### Known Limitations

- Browser automation slower than API calls (unavoidable)
- Dependent on Medium's website structure (selectors may break)
- Google login session persistence unreliable (documented AI development limitation)
- No support for editing existing articles (only new article publishing)

## Testing Strategy

This project uses a **multi-layered testing approach** to ensure reliability while acknowledging the challenges of testing browser automation code.

### Test Layers

1. **Unit Tests (Jest)** - Pure logic, validation, cookie handling
   - Cookie expiry validation
   - Session validation logic
   - Headless mode determination
   - **Fast execution**: ~1s total

2. **Integration Tests (Jest + Mocks)** - BrowserMediumClient methods with mocked Playwright
   - Browser initialization flow
   - Session loading and saving
   - Method parameter validation
   - MCP tool handler logic
   - **Fast execution**: ~1.5s total

3. **E2E Tests (Playwright)** - Real browser automation for critical flows
   - Full login flow with visible browser
   - Session persistence across browser restarts
   - Article publishing end-to-end
   - **Slower execution**: 30-60s per test

### Test Organization

```
src/
├── __tests__/
│   ├── unit/                    # Pure unit tests (29 tests)
│   │   ├── validation.test.ts   # Cookie validation logic
│   │   ├── cookie-utils.test.ts # Cookie expiry detection
│   │   └── headless-mode.test.ts # Headless mode logic
│   ├── integration/             # Integration tests (53 tests)
│   │   ├── browser-client.test.ts # BrowserMediumClient methods
│   │   └── mcp-tools.test.ts     # MCP tool handlers
│   └── helpers/                 # Test utilities
│       ├── mock-playwright.ts   # Playwright mock factory
│       ├── fixtures.ts          # Test data (sessions, articles)
│       └── matchers.ts          # Custom Jest matchers
tests/                           # Playwright E2E tests (18 tests)
```

### Coverage Philosophy

**Current Coverage: ~47% overall, 49% browser-client.ts**

This coverage level is **appropriate for browser automation code** because:

- ✅ **Core logic is well-tested**: Session management, validation, lifecycle (all >80%)
- ✅ **Integration points are tested**: All MCP tool handlers have tests
- ⚠️ **Complex UI automation is under-tested**: DOM parsing, selector fallbacks (30-40%)
- ⚠️ **Browser interaction is hard to mock**: Login flow, content extraction, search parsing

**Why NOT aiming for 80%+ coverage:**
- DOM selector strategies have many fallback paths (100+ branches)
- Playwright page.evaluate() logic is complex to mock meaningfully
- Testing mocked selectors provides little value (fragile, low signal)
- E2E tests provide better validation for UI automation

**Coverage Targets:**
- **Short term**: Maintain ~50% (current baseline)
- **Medium term**: 60% statements, 50% branches (realistic for browser code)
- **Long term**: Focus on test quality over quantity

### Testing Best Practices

When adding new features:
1. **Start with unit tests** for pure logic (validation, calculations)
2. **Add integration tests** for method flows with mocked Playwright
3. **Add E2E tests** only for critical user-facing flows
4. **Don't mock complex DOM interactions** - use E2E or skip

When debugging:
- **Jest tests**: Fast iteration for logic bugs
- **Playwright UI mode**: Visual debugging for selector issues
- **Debug scripts**: `scripts/debug-login.ts` for analyzing page structure

### Running Specific Test Suites

```bash
# Unit tests only (fast iteration)
npm run test:unit -- src/__tests__/unit/

# Integration tests only
npm run test:unit -- src/__tests__/integration/

# Specific test file
npm run test:unit -- src/__tests__/unit/validation.test.ts

# E2E tests only
npm test

# Everything
npm run test:all
```

## TypeScript Configuration

- Target: ES2020
- Module: CommonJS (required for MCP SDK)
- Strict mode enabled
- Source: `src/`, Output: `dist/`
- DOM types included for Playwright browser context

### Dependency Version Lock

**Important**: This project uses `@modelcontextprotocol/sdk@1.21.2` (locked in package.json without caret).

**Do NOT update to v1.22.0+** - newer versions introduce TypeScript type changes that cause infinite type recursion during compilation:
```
error TS2589: Type instantiation is excessively deep and possibly infinite
```

**Timeline of Breaking Changes**:
- **v1.15.0** (July 17, 2024) - Original working version
- **v1.16.0-v1.21.2** (July-November 2024) - Compatible, builds successfully ✓
- **v1.21.2** (November 2024) - **CURRENT VERSION** - Last version before breaking changes ✓
- **v1.22.0** (Nov 13, 2024) - `registerTool` now accepts `ZodType` for input/output schemas - **BREAKS BUILD**
- **v1.23.0** (Nov 25, 2024) - Added Zod v4 support with backwards compatibility for v3.25+
- **v1.24.0** (Dec 2, 2024) - Updated `registerTool` signature for typed `ToolCallback`, Zod v4 transformations
- **v1.25.0+** (Dec 15, 2024) - Moved Role type, removed `@cfworker/json-schema` dependency, removed loose/passthrough types

**Root Cause**: Starting in v1.22.0, the SDK changed how `server.tool()` handles Zod schema types. The new deeply nested generic types for tool registration cause TypeScript's type checker to enter infinite recursion when inferring types for complex Zod schemas (especially with `.optional()`, `.default()`, `.describe()` chaining).

**Version is locked**: The package.json specifies `"@modelcontextprotocol/sdk": "~1.21.2"` using tilde (`~`) to allow patch updates (1.21.x) but prevent minor/major version upgrades. This means security patches can be applied automatically while blocking the breaking changes in v1.22.0+.

**Future Upgrade**: To use v1.22.0+, you'll need to refactor tool registration to use explicit type annotations or simpler schema definitions that don't trigger TypeScript's recursion limit.

### Stealth Dependencies (v1.2+)

**Added for bot detection bypass**: `playwright-extra` + `puppeteer-extra-plugin-stealth`

These dependencies enable headless browser operation without being blocked by Cloudflare and other bot detection systems:
- **playwright-extra**: Wrapper around Playwright that enables plugin support
- **puppeteer-extra-plugin-stealth**: Plugin that masks automation fingerprints

**Why needed**: Medium uses Cloudflare which blocks standard headless browsers. The stealth plugin:
- Removes `navigator.webdriver` property
- Spoofs Chrome DevTools Protocol detection
- Masks WebGL/Canvas fingerprinting
- Fixes timezone/locale inconsistencies
- Passes most bot detection tests

**Installation**: Already included in package.json dependencies. No special configuration needed.
