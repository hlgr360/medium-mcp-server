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
# Run tests
npm test

# Note: test-browser.js mentioned in README does not exist in current codebase
```

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

- Session file: `medium-session.json` (gitignored)
- Contains cookies and localStorage state
- Login required only on first run or session expiry
- Browser launches non-headless initially for login, can run headless after

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
      "args": ["<absolute-path-to-repo>/dist/index.js"],
      "cwd": "<absolute-path-to-repo>"
    }
  }
}
```

## Important Notes

### Browser Automation Considerations

- **Speed**: Operations take 10-30 seconds (browser automation overhead)
- **Selector Fragility**: Medium UI changes will break selectors - use multiple fallback strategies
- **Google Login Issues**: Email/password login preferred; Google OAuth has session persistence issues
- **Headless Mode**: Browser starts visible (`headless: false`) for initial login, can be changed after session established

### Development Guidelines

- **When adding new tools**: Follow the pattern in index.ts (Zod schema validation, error wrapping)
- **When updating selectors**: Add new selectors to fallback arrays, don't replace existing ones
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
