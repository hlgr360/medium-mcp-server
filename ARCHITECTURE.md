# Architecture Documentation

This document provides detailed technical information about the Medium MCP Server's architecture, code quality improvements, and internal implementation details.

## Table of Contents

- [Code Quality & Refactoring History](#code-quality--refactoring-history)
- [Type Safety Improvements](#type-safety-improvements)
- [Data Flow](#data-flow)
- [Dependency Management](#dependency-management)
- [Session Management Implementation](#session-management-implementation)

## Code Quality & Refactoring History

### Phase 3: Complex Function Refactoring (Dec 2024)

Large, monolithic functions were broken down into focused helper methods following the Single Responsibility Principle:

#### 1. `ensureLoggedIn()` Refactoring (99 lines → 53 lines + 3 helpers)

**Extracted Methods**:
- `checkLoginRedirect()`: Fast session validation via redirect detection
- `detectLoginIndicators()`: DOM-based login state detection using multiple selectors
- `waitForUserLogin()`: Manual login flow handler with timeout management

**Benefits**: Improved testability, easier debugging, clearer separation of concerns

**Location**: browser-client.ts:172-321

#### 2. `getUserArticles()` Refactoring (161 lines → 67 lines + 3 helpers)

**Extracted Methods**:
- `parseArticleTabs()`: Tab navigation parsing with article count detection
- `mapTabToStatus()`: Maps tab names to article status enum values
- `extractArticlesFromTable()`: Article metadata extraction from table rows

**Benefits**: Reduced complexity, reusable table extraction logic, clearer main method flow

**Location**: browser-client.ts:372-566

### Phase 1: Configuration Constants

**Timeout Constants**: All magic numbers extracted to `TIMEOUTS` constant (lines 91-99)
- `LOGIN`: 300,000ms (5 minutes)
- `PAGE_LOAD`: 60,000ms (60 seconds)
- `SHORT_WAIT`: 2,000ms (2 seconds)
- `CONTENT_WAIT`: 3,000ms (3 seconds)
- `EDITOR_LOAD`: 15,000ms (15 seconds)
- `NETWORK_IDLE`: 10,000ms (10 seconds)

**Viewport Constants**: `VIEWPORT.WIDTH` (1280) and `VIEWPORT.HEIGHT` (720) at line 100

**Benefits**: Easy to customize, self-documenting, consistent across codebase

## Type Safety Improvements

### Phase 4: Eliminating `any` Types (Dec 2024)

#### 1. Catch Block Error Handling (10 occurrences)

**Old**: `catch (error: any) { ... error.message }`

**New**: `catch (error) { const message = error instanceof Error ? error.message : String(error) }`

**Benefits**: Safer error handling, works with both Error objects and other thrown values

**Locations**: browser-client.ts (2), index.ts (8)

#### 2. Browser Context Options

**Old**: `const contextOptions: any = {...}`

**New**: `const contextOptions: BrowserContextOptions = {...}`

**Benefits**: IDE autocomplete, compile-time validation of browser options

**Location**: browser-client.ts:96

#### 3. Article Arrays in Browser Context (5 occurrences)

**Old**: `const articles: any[] = []`

**New**: Inline type definitions matching return interfaces

**Examples**:
- `extractArticlesFromTable`: Typed array with status union type
- `searchMediumArticles`: Typed search result structure
- `extractArticleCards`: Feed article structure with feedCategory
- `getLists`: Reading list structure

**Benefits**: Type safety in browser-side code, catches property mismatches

**Locations**: Lines 455, 893, 1271, 1452, 1581

#### 4. Storage State Type Definition

**New Interface**: `StorageState` (lines 64-79) based on Playwright's format

**Typed Methods**: `validateStorageState()` and `getEarliestCookieExpiry()`

**Benefits**: Structured cookie/session validation, prevents invalid state objects

**Locations**: browser-client.ts:1128, 1168

#### Type Safety Metrics

- **Before**: 25 `any` type usages
- **After**: ~5 `any` uses (only in legitimate cases: log functions, test helpers)
- **Coverage**: ~80% of previous `any` uses eliminated
- **Impact**: Stronger compile-time safety, better IDE support, easier refactoring

## Data Flow

```
MCP Client (Claude Desktop)
  ↓ stdio transport
MediumMcpServer (index.ts)
  ↓ tool invocation
BrowserMediumClient (browser-client.ts)
  ↓ Playwright automation
Chromium Browser → Medium Website
  ↓ DOM manipulation
Response → JSON → MCP Client
```

### Tool Registration Flow

1. MCP Server initializes and registers 8 tools with Zod schemas
2. Claude Desktop sends tool invocation via stdio
3. Server validates parameters with Zod
4. BrowserMediumClient method called
5. Browser automation performs action
6. Result serialized to JSON and returned

### Error Handling Pattern

All tools follow consistent error handling:

```typescript
try {
  const result = await client.someMethod();
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    content: [{ type: "text", text: JSON.stringify({ error: message }) }],
    isError: true
  };
}
```

## Dependency Management

### MCP SDK Version Lock

**Current Version**: `@modelcontextprotocol/sdk@1.21.2` (locked with tilde `~`)

**Why Locked**: v1.22.0+ introduces breaking TypeScript type changes that cause infinite type recursion:

```
error TS2589: Type instantiation is excessively deep and possibly infinite
```

**Timeline**:
- **v1.21.2** (Nov 2024) - ✅ CURRENT - Last stable version
- **v1.22.0** (Nov 13, 2024) - ❌ BREAKS - New `registerTool` signature
- **v1.23.0** (Nov 25, 2024) - ❌ Zod v4 support changes
- **v1.24.0** (Dec 2, 2024) - ❌ Typed `ToolCallback` changes
- **v1.25.0+** (Dec 15, 2024) - ❌ Role type moved, dependencies removed

**Root Cause**: New deeply nested generic types for tool registration cause TypeScript's type checker to enter infinite recursion with complex Zod schemas (especially `.optional()`, `.default()`, `.describe()` chaining).

**Upgrade Path**: To use v1.22.0+, refactor tool registration to use explicit type annotations or simpler schema definitions.

### Stealth Dependencies (v1.2+)

Added for bot detection bypass: `playwright-extra` + `puppeteer-extra-plugin-stealth`

**Why Needed**: Medium uses Cloudflare which blocks standard headless browsers.

**What They Do**:
- Remove `navigator.webdriver` property
- Spoof Chrome DevTools Protocol detection
- Mask WebGL/Canvas fingerprinting
- Fix timezone/locale inconsistencies
- Pass most bot detection tests

## Session Management Implementation

### Cookie Validation Flow

```typescript
preValidateSession()
  → Check if session file exists
  → Parse JSON
  → validateStorageState()
    → Check each auth cookie (sid, uid, session)
    → Compare cookie.expires vs Date.now()
    → Return false if ANY auth cookie expired
  → Return validation result
```

### Session Lifecycle

1. **Initial Login** (non-headless):
   - Navigate to `/m/signin`
   - Check if already logged in (redirect to homepage)
   - If not logged in, wait for user to complete login (5 min timeout)
   - Save cookies + localStorage to `medium-session.json`

2. **Subsequent Operations** (headless):
   - Load session from file
   - Validate cookies haven't expired
   - Create browser context with session
   - Verify session via fast redirect check
   - **Auto-save session after operation completes** (v1.4+)

3. **Session Expiry**:
   - Detected by `preValidateSession()` before browser launch
   - OR detected by `validateSessionFast()` after browser launch
   - Triggers re-authentication flow

### Automatic Session Persistence (v1.4+)

**Implementation**: All browser operations automatically call `saveSession()` after successful completion.

**Operations that auto-save session**:
- `getUserArticles()` - browser-client.ts:600
- `getArticleContent()` - browser-client.ts:793
- `publishArticle()` - browser-client.ts:860, 873
- `searchMediumArticles()` - browser-client.ts:1138
- `getFeed()` - browser-client.ts:1600
- `getLists()` - browser-client.ts:1754
- `getListArticles()` - browser-client.ts:1825

**Why**: Medium may update cookies during normal operations (CSRF tokens, session refreshes). Capturing these updates ensures:
- Sessions stay valid during long-running operations
- Test suites can run for extended periods without re-authentication
- MCP server instances maintain authentication across multiple requests

**Performance**: Minimal overhead (~100ms per operation for JSON write to disk)

**See**: `docs/adr/ADR_20260101_01_session_persistence_after_operations.md` for detailed rationale

### Fast Session Validation (v1.2+)

**Old Method** (21s): Navigate to homepage, wait for DOM, check for login indicators

**New Method** (5s): Navigate to `/m/signin`, check for redirect

```typescript
await page.goto('https://medium.com/m/signin');
const currentUrl = page.url();
if (!currentUrl.includes('/m/signin')) {
  // Redirected away from login page = logged in
  return true;
}
// Still on login page = not logged in
return false;
```

**Benefits**:
- 4x faster validation
- More reliable (uses HTTP redirects vs DOM selectors)
- Works for both fresh sessions and expired re-logins

### Login Flow Optimization (v1.2, Dec 2025)

**Smart Login Check**: Always navigate to `/m/signin` first

- If already logged in → Medium auto-redirects to homepage ✅
- If not logged in → Stays on `/m/signin` (ready for login) ✅

**Benefits**:
- No delay checking selectors on homepage (was 10-20 seconds)
- Single navigation instead of homepage → check → login page
- Uses Medium's built-in redirect behavior

## Browser Lifecycle

### Per-Operation Model

The browser is **NOT persistent** - it opens fresh for each operation:

1. Tool invoked
2. `client.initialize()` called
3. Browser launches (headless if valid session exists)
4. Operation executes
5. `client.close()` called
6. Browser terminates

**Why This Design**:
- ✅ Saves system resources
- ✅ Clean state for each operation
- ✅ No leaked browser processes
- ❌ Adds 5-10s startup overhead per operation

### Headless Mode Determination

```typescript
const headlessMode = forceHeadless !== undefined
  ? forceHeadless
  : this.isAuthenticatedSession;
```

- `forceHeadless=true`: Force headless (for testing)
- `forceHeadless=false`: Force visible (for `login-to-medium` tool)
- `undefined`: Auto-determine (headless if valid session exists)

## Selector Strategy

### Fallback Pattern

All selectors use arrays with multiple fallback options:

```typescript
const selectors = [
  '[data-testid="headerUserIcon"]',      // Most stable
  '[data-testid="headerWriteButton"]',   // Backup
  'button[aria-label*="user"]'           // Generic fallback
];

for (const selector of selectors) {
  const element = await page.$(selector);
  if (element) return element;
}
```

### Current Selectors (v1.3.0)

**Login Indicators**:
- `[data-testid="headerUserIcon"]`
- `[data-testid="headerWriteButton"]`
- `[data-testid="headerNotificationButton"]`
- `button[aria-label*="user"]`

**Article List**:
- `table tbody tr` containing `h2`
- Links: `a[href*="/p/"][href*="/edit"]` (drafts) or `a[href*="/@"]` (published)

**Editor**:
- Title: `[data-testid="editorTitleParagraph"]`
- Content: `[data-testid="editorParagraphText"]`

**Reading Lists**:
- `[data-testid="readingList"]` (primary)
- `a[href*="/list/"]` (fallback)

**Feed Articles**:
- `article`
- `[data-testid="story-preview"]`
- Title from `h1/h2/h3`
- URL from title link (not first link)

### Selector Maintenance

When Medium changes UI:
1. Run appropriate debug script (e.g., `debug-login.ts`)
2. Identify new selectors (prefer `data-testid`)
3. Add to fallback array (don't replace existing)
4. Update this documentation
5. Re-capture fixtures
6. Run tests

See main AGENTS.md for full debugging workflow.
