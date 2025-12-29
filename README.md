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
- 📰 **Browse Medium feeds** - Featured, For You, and Following feeds (NEW in v1.3.0)
- 📋 **Manage reading lists** - Browse and access your saved collections (NEW in v1.3.0)
- 🔍 **Search Medium articles** by keywords
- 📖 **Read full articles** - Extract content from any Medium URL
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

#### Advanced Configuration

For developers who want to customize the server's behavior, you can modify constants in `src/browser-client.ts`:

##### Timeout Constants

All timeouts are defined as static constants in the `BrowserMediumClient` class (lines 91-99):

```typescript
private static readonly TIMEOUTS = {
  LOGIN: 300_000,           // 5 minutes - user login interaction
  PAGE_LOAD: 60_000,        // 60 seconds - article content loading
  SHORT_WAIT: 2_000,        // 2 seconds - UI element appearance
  CONTENT_WAIT: 3_000,      // 3 seconds - dynamic content loading
  EDITOR_LOAD: 15_000,      // 15 seconds - rich text editor initialization
  NETWORK_IDLE: 10_000      // 10 seconds - network activity settlement
} as const;
```

**Common Customizations:**
- **Slow network**: Increase `PAGE_LOAD` and `NETWORK_IDLE`
- **Slow login**: Increase `LOGIN` timeout
- **Fast connections**: Decrease `SHORT_WAIT` and `CONTENT_WAIT` for faster operations

##### Viewport Settings

Browser viewport dimensions (line 100):

```typescript
private static readonly VIEWPORT = {
  WIDTH: 1280,
  HEIGHT: 720
} as const;
```

**Note**: Changing viewport may affect element visibility and selector detection.

##### Selector Configuration

Medium UI selectors are defined with fallback strategies throughout `browser-client.ts`. Key selector locations:

- **Login indicators** (line 213): User icon, write button, notifications
- **Article list** (lines 385-399): Tab detection and article table parsing
- **Editor fields** (lines 671-730): Title and content contenteditable elements
- **Feed articles** (lines 1283-1290): Article cards on feed pages
- **Reading lists** (lines 1591-1598): List containers on lists page

**When Medium UI changes:**
1. Run appropriate debug script (see "Debugging Selector Issues" section)
2. Update selectors in `browser-client.ts`
3. Add new selectors to fallback arrays (don't replace existing ones)
4. Test with corresponding test script

For detailed selector debugging workflow, see the "Medium UI Changes - Debugging Selector Issues" section below.

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

This server exposes 8 MCP tools for Medium interaction:

### Content Creation & Management
1. **`publish-article`** - Create article drafts with title and content
2. **`get-my-articles`** - Retrieve all your Medium articles (drafts, published, etc.) with status tags

### Content Discovery
3. **`get-feed`** - Retrieve article headers from Medium feeds (Featured, For You, Following)
4. **`get-lists`** - Retrieve your saved Medium reading lists
5. **`get-list-articles`** - Retrieve articles from a specific reading list
6. **`search-medium`** - Search Medium for articles by keywords

### Content Reading
7. **`get-article-content`** - Extract full content from any Medium article URL

### Authentication
8. **`login-to-medium`** - Manually trigger login process (opens browser)

---

### 1. `publish-article`
Create a new article draft on Medium
```typescript
{
  title: string,      // Article title
  content: string,    // Article content (supports multiple paragraphs)
  tags?: string[]     // Optional tags (not currently functional)
}
```

**Note**: This tool creates drafts only. Articles are saved to your Medium drafts and not automatically published. Tag support requires additional selector updates.

### 2. `get-my-articles`
Retrieve ALL your Medium articles (drafts, published, unlisted, etc.)
```typescript
// No parameters needed
// Returns: Array of articles with:
// - title, url, publishDate
// - status: 'draft' | 'published' | 'unlisted' | 'scheduled' | 'submission'
// NEW in v1.2: Returns articles from ALL tabs with status tagging
```

### 3. `get-feed`
Retrieve article headers from Medium feeds (NEW in v1.3.0)
```typescript
{
  category: 'featured' | 'for-you' | 'following' | 'all',  // Feed category
  limit?: number  // Max articles per feed (default: 10, max: 50)
}
// Returns: Array of articles with title, excerpt, url, author, publishDate, readTime
// When using 'all': fetches from all 3 feeds, returns up to limit*3 articles
// Each article includes feedCategory field indicating its source feed
// Use the 'url' field with get-article-content to read full articles
```

### 4. `get-lists`
Retrieve your saved Medium reading lists (NEW in v1.3.0)
```typescript
// No parameters needed
// Returns: Array of lists with id, name, description, articleCount, url
// Use the 'id' field with get-list-articles to retrieve articles
```

### 5. `get-list-articles`
Retrieve articles from a specific reading list (NEW in v1.3.0)
```typescript
{
  listId: string,  // List ID from get-lists
  limit?: number   // Max articles to return (default: 10, max: 50)
}
// Returns: Array of articles with title, excerpt, url, author, publishDate, readTime
// Use the 'url' field with get-article-content to read full articles
```

### 6. `search-medium`
Search Medium for articles by keywords
```typescript
{
  keywords: string[]  // Array of search terms
}
```

### 7. `get-article-content`
Get full content of any Medium article
```typescript
{
  url: string  // Medium article URL (from get-feed, get-list-articles, or search-medium)
}
```

### 8. `login-to-medium`
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

### Example 1: Creating a Draft Article
```
User: "Create a draft article titled 'AI in 2025' with content about recent developments"

Claude: Uses publish-article tool →
- Opens Medium editor
- Fills in title and content
- Saves as draft
- Returns success
```

### Example 2: Discovering and Reading Articles (NEW in v1.3.0)
```
User: "Show me the latest articles from all my feeds"

Claude:
1. Uses get-feed tool with category='all', limit=5 →
   Returns: [
     { title: "AI Trends", url: "...", feedCategory: "featured" },
     { title: "ML Guide", url: "...", feedCategory: "featured" },
     ...
     { title: "Python Tips", url: "...", feedCategory: "for-you" },
     ...
     { title: "Tech News", url: "...", feedCategory: "following" },
     ...
   ]
   (Up to 15 articles: 5 from Featured + 5 from For You + 5 from Following)

2. Articles are tagged with feedCategory for easy filtering
3. Use get-article-content tool with any url to read full content
```

### Example 3: Working with Reading Lists
```
User: "What articles are in my 'Tech Articles' list?"

Claude:
1. Uses get-lists tool →
   Returns: [
     { id: "tech-articles-xyz789", name: "Tech Articles", articleCount: 42, ... },
     ...
   ]

2. Uses get-list-articles tool with listId='tech-articles-xyz789' →
   Returns: Array of articles with titles, excerpts, and URLs

3. (Optional) Uses get-article-content tool with specific URLs to read full articles
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

### Medium UI Changes - Debugging Selector Issues

When Medium updates their website, selectors break. Here's how to fix them:

#### Workflow for Fixing Broken Selectors

1. **Identify which functionality broke** (login, article retrieval, publishing)
2. **Run the appropriate debug script** (see table below)
3. **Analyze the output** to find new selectors
4. **Update `src/browser-client.ts`** with new selectors
5. **Run the corresponding test** to verify the fix
6. **Update documentation** (README.md, CLAUDE.md) with new selectors

#### Debug Scripts by Functionality

| **Functionality** | **Debug Script** | **Purpose** | **What It Shows** |
|-------------------|------------------|-------------|-------------------|
| **Login Detection** | `scripts/debug-login.ts` | Analyze login page selectors | Current login indicators, button text, data-testid values |
| **Article List** | `scripts/debug-articles-detailed.ts` | Analyze articles page DOM | Table structure, tabs, link formats, article counts |
| **Article List** | `scripts/debug-tab-navigation.ts` | Test tab clicking | Tab detection, navigation behavior |
| **Article Editor** | `scripts/debug-editor-wait.ts` | Analyze editor selectors | Title/content fields, contenteditable elements, placeholders |
| **Publish Modal** | `scripts/debug-publish-modal.ts` | Analyze publish modal | Tag inputs, publish buttons, modal structure |

#### Test Scripts for Validation

| **Test Script** | **Purpose** | **Expected Result** |
|-----------------|-------------|---------------------|
| `scripts/test-get-articles-simple.ts` | Test article retrieval | Lists all articles with status tags |
| `scripts/test-publish-no-tags.ts` | Test draft creation | Successfully creates draft |
| `scripts/test-login-flow.ts` | Test login detection | Confirms session is valid |

#### How to Use Debug Scripts

All scripts open a **visible browser window** and wait 60-90 seconds for manual inspection:

```bash
# Example: Debug login page
npx ts-node scripts/debug-login.ts

# Output shows:
# - All buttons with their text and data-testid
# - Elements that might indicate logged-in state
# - Screenshot saved to debug-login.png
# - Browser stays open for manual inspection
```

#### Recent Selector Changes (v1.2, Dec 2025)

- **Login**: `headerUserButton` → `headerUserIcon`, `write-button` → `headerWriteButton`
- **Articles**: `[data-testid="story-preview"]` → table-based scraping with tab detection
- **Editor**: `[data-testid="richTextEditor"]` → `editorTitleParagraph` + `editorParagraphText`

#### When Selectors Break

1. Run debug script for affected area
2. Look for `data-testid` attributes (Medium's preferred approach)
3. Fall back to semantic selectors (class names, roles, aria-labels)
4. Update both the primary selector AND fallback selectors in code
5. Add comment with date of change (e.g., `// Updated Dec 2025`)

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
- **index.ts**: MCP server with 8 registered tools
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
