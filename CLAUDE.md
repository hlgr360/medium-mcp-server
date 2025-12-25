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
```bash
# Run all tests with Playwright Test
npm test

# Run tests with visible browser
npm run test:headed

# Open Playwright Test UI for debugging
npm run test:ui

# View HTML test report
npm run test:report
```

**Test Coverage**:
- **Session Management**: Cookie validation, session persistence, expiry detection
- **Browser Lifecycle**: Initialize/close cycles, headless mode switching
- **Authentication**: Fast session validation, login timeout handling

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

**Login Flow Optimization (Dec 2024)**:
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
- **Selector Fragility**: Medium UI changes will break selectors - use multiple fallback strategies
  - **Latest Update (Dec 2024)**: Medium changed `data-testid` selectors:
    - `headerUserButton` → `headerUserIcon` (user profile button)
    - `write-button` → `headerWriteButton` (write button)
    - Added `headerNotificationButton` as additional login indicator
  - **Debugging UI Changes**: Use `src/debug-login.ts` to analyze current page structure and find new selectors
- **Google Login Issues**: Email/password login preferred; Google OAuth may have session persistence issues
- **Headless Mode**: Browser auto-switches to headless mode after initial login. Non-headless only for `login-to-medium` tool.
- **Session Validation**: Fast validation check (5s) runs before each operation to ensure session is still valid

### Development Guidelines

- **When adding new tools**: Follow the pattern in index.ts (Zod schema validation, error wrapping)
- **When updating selectors**: Add new selectors to fallback arrays, don't replace existing ones
  - **Current login selectors (Dec 2024)**: `[data-testid="headerUserIcon"]`, `[data-testid="headerWriteButton"]`, `[data-testid="headerNotificationButton"]`, `button[aria-label*="user"]`
  - **Debugging selector changes**: Run `npm run build && node dist/debug-login.js` to analyze current page structure
- **Session debugging**: Delete `medium-session.json` to force re-login
- **Console logging**: Use `console.error()` for debugging (stdout reserved for MCP JSON protocol)
- **Browser context**: Silent logging in `page.evaluate()` to avoid JSON serialization issues

### Known Limitations

- Browser automation slower than API calls (unavoidable)
- Dependent on Medium's website structure (selectors may break)
- Google login session persistence unreliable (documented AI development limitation)
- No support for editing existing articles (only new article publishing)

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
