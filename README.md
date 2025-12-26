# <img src="https://cdn-static-1.medium.com/_/fp/icons/Medium-Avatar-500x500.svg" alt="Medium Logo" width="32" height="32"> Medium MCP Server (Browser-Based)

## Overview
Medium MCP (Model Context Protocol) is a browser-based solution for programmatically interacting with Medium's content ecosystem. Since Medium discontinued their public API for new users, this server uses browser automation to provide intelligent and context-aware content management.

## 🔄 Why Browser-Based?
Medium stopped issuing new API tokens in 2023, making traditional API integration impossible for new developers. This implementation uses Playwright browser automation to:
- ✅ **Work without API tokens** - Uses your existing Medium login session
- ✅ **Full functionality** - Publish, search, and manage your Medium content
- ✅ **Secure** - Saves your login session locally for reuse
- ✅ **Interactive** - Opens browser for initial login, then runs headlessly

## 📖 Deep Dive Article
Want to understand the full story behind Medium MCP? Check out the comprehensive article:

[From Thought to Published: How MediumMCP Streamlines the AI-to-Medium Platform Workflow](https://dishantragav27.medium.com/from-thought-to-published-how-mediummcp-streamlines-the-ai-to-medium-platform-workflow-9e436159d1a2)

## Key Features
- 🤖 **Browser automation** for Medium interaction
- 📝 **Article publishing** with title, content, and tags
- 📚 **Retrieve your articles** from your Medium profile
- 🔍 **Search Medium articles** by keywords
- 💾 **Session persistence** - login once, use everywhere
- 🎯 **Claude integration** via Model Context Protocol

## Technology Stack
- TypeScript
- Model Context Protocol (MCP)
- Playwright Browser Automation
- Advanced Content Parsing

## Getting Started

### Prerequisites
- Node.js (v16 or later)
- npm or yarn
- A Medium account (no API credentials needed!)

### Installation
```bash
# Clone the repository
git clone https://github.com/jackyckma/medium-mcp-server.git

# Navigate to the project directory
cd medium-mcp-server

# Install dependencies (automatically installs Chromium browser via postinstall)
npm install

# Build the project
npm run build
```

### Configuration
No API keys needed! The server will prompt you to login to Medium in your browser on first use.

### Usage

#### Test the Browser Client
```bash
# Test the browser automation (optional)
node test-browser.js
```

#### Start the MCP Server
```bash
npm start
```

#### Add to Claude Configuration
Add this to your Claude MCP configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

**Important Notes:**
- Use **absolute paths** (not relative paths like `~/` or `path/to/`)
- The `cwd` parameter is **not reliable** in Claude Desktop (working directory may be `/`)
- Session file is stored in the project directory (`medium-session.json`)
- Example: `"/Users/yourusername/repos/medium-mcp-server/dist/index.js"`

## Available MCP Tools

### 1. `publish-article`
Create a new article draft on Medium
```typescript
{
  title: string,      // Article title
  content: string,    // Article content (supports multiple paragraphs)
  tags?: string[],    // Optional tags (not currently functional)
  isDraft?: boolean   // Save as draft (recommended: true)
}
```

**Note**: Currently tested and verified for draft creation only (`isDraft: true`). Full publish flow and tag support require additional selector updates.

### 2. `get-my-articles`
Retrieve ALL your Medium articles (drafts, published, unlisted, etc.)
```typescript
// No parameters needed
// Returns: Array of articles with:
// - title, url, publishDate
// - status: 'draft' | 'published' | 'unlisted' | 'scheduled' | 'submission'
// NEW in v1.2: Returns articles from ALL tabs with status tagging
```

### 3. `get-article-content`
Get full content of any Medium article
```typescript
{
  url: string  // Medium article URL
}
```

### 4. `search-medium`
Search Medium for articles by keywords
```typescript
{
  keywords: string[]  // Array of search terms
}
```

### 5. `login-to-medium`
Manually trigger login process
```typescript
// No parameters needed
// Opens browser for login if not already authenticated
```

## How It Works

### First Time Setup
1. **Start the server** - Run `npm start`
2. **Call login-to-medium tool** - Use this MCP tool to trigger login
3. **Login in browser** - A Chrome window opens for you to login to Medium
4. **Session saved** - Your login session is saved to `medium-session.json`
5. **Future operations** - Browser automatically uses headless mode with saved session

**Important**: Browser launches fresh for each operation and closes when done. This saves resources but adds 5-10s startup time per operation.

### Browser Automation Flow
```
User Request → MCP Server → Playwright Browser → Medium Website → Response
```

### Session Management
- **Storage**: Login session stored in `medium-session.json` (cookies + localStorage)
- **Validation**: Cookies are validated for expiration before each operation (5s fast check)
- **Auto-Login**: If session is invalid/expired, browser opens for re-login automatically
- **Headless Mode**: Browser uses headless mode when valid session exists, non-headless only for login
- **Debugging**: Delete `medium-session.json` to force re-login and test from scratch

## Example Usage with Claude

```
User: "Create a draft article titled 'AI in 2025' with content about recent developments"

Claude: Uses publish-article tool →
- Opens Medium editor
- Fills in title and content
- Saves as draft
- Returns success
```

## Troubleshooting

### Debugging MCP Server

When experiencing issues with the MCP server, check the Claude Desktop logs:

```bash
# View all MCP server logs in real-time
tail -f ~/Library/Logs/Claude/mcp*.log

# Filter for specific information
tail -f ~/Library/Logs/Claude/mcp*.log | grep "medium-mcp"
tail -f ~/Library/Logs/Claude/mcp*.log | grep "Working directory"
tail -f ~/Library/Logs/Claude/mcp*.log | grep "Session"

# View recent errors
tail -100 ~/Library/Logs/Claude/mcp*.log | grep -i error
```

**Common log locations:**
- **macOS**: `~/Library/Logs/Claude/mcp*.log`
- **Windows**: `%APPDATA%\Claude\logs\mcp*.log`

**What to look for in logs:**
- Working directory (should be your project directory, not `/`)
- Session file path and whether it exists
- Browser initialization messages
- Error messages from Playwright or Medium automation

### Browser Issues
- **Browser won't open**: Check if Chromium is installed (`npx playwright install chromium`)
- **Login fails**: Clear `medium-session.json` and try again
- **Slow performance**: Browser automation takes 10-30 seconds per operation

### Login Detection Issues
- **Browser doesn't close after login** (Fixed in v1.2): Update to latest version - Medium changed their UI selectors
- **Session file not created**: Ensure you complete the full login (see profile icon appear)
- **Debug login detection**: Run `npx ts-node scripts/debug-login.ts` to analyze current page selectors
- **Current selectors (v1.2)**:
  - User icon: `[data-testid="headerUserIcon"]`
  - Write button: `[data-testid="headerWriteButton"]`
  - Notifications: `[data-testid="headerNotificationButton"]`

### Article Retrieval Issues (v1.2+)
- **`get-my-articles` returns 0 articles**: Medium changed from card layout to table layout
  - **Fixed in v1.2**: Update to latest version with tab-based scraping
  - **Debug article page**: Run `npx ts-node scripts/debug-articles.ts` to analyze page structure
  - **Test retrieval**: Run `npx ts-node scripts/test-all-articles.ts` to validate
- **Missing articles from specific tabs**: Check tab counts manually
  - Tabs show counts: "Drafts1", "Published2", etc.
  - Only tabs with counts > 0 are scraped
- **Wrong article status**: Status is determined by which tab the article appears in
  - Ensure articles are actually in the expected Medium tab
- **Cloudflare blocking in headless mode** (Fixed in v1.2): Stealth mode now bypasses detection
  - Uses `playwright-extra` with `puppeteer-extra-plugin-stealth`
  - No VPN needed for headless operation

### Medium UI Changes
- **Selectors outdated**: Medium occasionally changes their website structure
  - **Latest update**: v1.2 (December 2025) - Changed `headerUserButton` → `headerUserIcon`
  - **Solution**: Run debug script to find new selectors: `npx ts-node scripts/debug-login.ts`
- **Login blocked**: Use your regular browser to login first, then try again

### Common Errors
- **`Browser not initialized`**: Restart the server
- **`Login timeout`**: Increase timeout in browser-client.ts (default: 5 minutes)
- **`Element not found`**: Medium may have changed their UI - check debug script output
- **`EROFS: read-only file system`**: Session file can't be written
  - Check logs: `tail -f ~/Library/Logs/Claude/mcp*.log | grep "Working directory"`
  - If working directory is `/`, update to latest version (fixed in v1.2)
  - Session file now uses project directory instead of working directory
- **Repeated login prompts**: Session not persisting
  - Check if `medium-session.json` exists in project root
  - Verify file has cookies: `cat medium-session.json | jq '.cookies | length'`
  - Check file permissions: `ls -l medium-session.json`

## Development

### Project Structure
```
medium-mcp-server/
├── src/
│   ├── index.ts                      # MCP server entry point
│   ├── browser-client.ts             # Playwright browser automation
│   ├── auth.ts                       # Legacy OAuth (unused)
│   ├── client.ts                     # Legacy API client (unused)
│   └── __tests__/                    # Jest test suite
│       ├── unit/                     # Pure unit tests (29 tests)
│       │   ├── validation.test.ts    # Cookie validation logic
│       │   ├── cookie-utils.test.ts  # Cookie expiry detection
│       │   └── headless-mode.test.ts # Headless mode logic
│       ├── integration/              # Integration tests (53 tests)
│       │   ├── browser-client.test.ts # BrowserMediumClient methods
│       │   └── mcp-tools.test.ts     # MCP tool handlers
│       └── helpers/                  # Test utilities
│           ├── mock-playwright.ts    # Playwright mock factory
│           ├── fixtures.ts           # Test data
│           └── matchers.ts           # Custom Jest matchers
├── tests/                            # Playwright E2E tests
│   ├── session-management.spec.ts    # Session persistence E2E
│   ├── browser-lifecycle.spec.ts     # Browser lifecycle E2E
│   ├── authentication.spec.ts        # Authentication E2E
│   └── get-user-articles.spec.ts     # Article retrieval E2E (NEW v1.2)
├── scripts/
│   ├── debug-login.ts                # Debug login selector issues
│   ├── debug-articles.ts             # Debug article page structure
│   ├── debug-articles-detailed.ts    # Deep article DOM analysis
│   ├── debug-table-structure.ts      # Analyze article table structure
│   └── test-all-articles.ts          # Quick test for getUserArticles
├── dist/                             # Compiled JavaScript output
├── medium-session.json               # Saved login session (gitignored)
├── package.json                      # Dependencies and scripts
├── tsconfig.json                     # TypeScript configuration
├── jest.config.js                    # Jest test configuration
├── playwright.config.ts              # Playwright E2E configuration
├── CLAUDE.md                         # AI development guide
└── README.md                         # This file
```

**Key Files:**
- **index.ts**: MCP server with 5 registered tools
- **browser-client.ts**: Core Playwright automation engine
- **medium-session.json**: Persistent login session storage
- **auth.ts/client.ts**: Legacy API code (unused, kept for reference)
- **scripts/debug-login.ts**: Debugging tool for Medium UI changes

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
- Session persistence and cookie validation
- Browser lifecycle management
- Authentication and session validation
- Headless mode switching
- **Article retrieval** (v1.2): Tab-based scraping, status tagging, dual link formats
- **Article publishing** (v1.2): Draft creation with new editor selectors

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

**Unit/Integration Test Coverage**:
- Cookie validation and expiry detection (29 unit tests)
- BrowserMediumClient integration with mocked Playwright (32 tests)
- MCP tool handler methods (21 tests)
- **Total**: 82 Jest tests, 47% code coverage
- **Coverage**: session management, browser lifecycle, validation logic

#### Build & Run
```bash
# Build project
npm run build

# Run MCP server
npm start
```

## Security Notes
- ✅ **Local only** - No data sent to external servers
- ✅ **Session encryption** - Browser handles all security
- ✅ **No API keys** - Uses your existing Medium login
- ⚠️ **Browser storage** - Session saved locally in JSON file

## Limitations
- **Speed**: Browser automation is slower than API calls (10-30s vs 1-2s)
- **Reliability**: Dependent on Medium's website structure
- **Headless**: Requires display for initial login (can run headless after)
- **Rate limits**: Subject to Medium's normal usage limits

## Contributing
Contributions welcome! Please read CONTRIBUTING.md for guidelines.

## License
MIT License - see LICENSE file for details.

---

**Note**: This is an unofficial tool and is not affiliated with Medium. Use responsibly and in accordance with Medium's Terms of Service.
