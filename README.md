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

# Install dependencies
npm install

# Install browser for automation
npx playwright install chromium

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
Add this to your Claude MCP configuration:
```json
{
  "mcpServers": {
    "medium-mcp": {
      "command": "node",
      "args": ["path/to/medium-mcp-server/dist/index.js"],
      "cwd": "path/to/medium-mcp-server"
    }
  }
}
```

## Available MCP Tools

### 1. `publish-article`
Publish a new article to Medium
```typescript
{
  title: string,      // Article title
  content: string,    // Article content (markdown supported)
  tags?: string[],    // Optional tags
  isDraft?: boolean   // Save as draft (default: false)
}
```

### 2. `get-my-articles`
Retrieve your published Medium articles
```typescript
// No parameters needed
// Returns: Array of your articles with titles, URLs, and dates
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
User: "Publish an article titled 'AI in 2025' with content about recent developments"

Claude: Uses publish-article tool →
- Opens Medium editor
- Fills in title and content
- Publishes article
- Returns success with article URL
```

## Troubleshooting

### Browser Issues
- **Browser won't open**: Check if Chromium is installed (`npx playwright install chromium`)
- **Login fails**: Clear `medium-session.json` and try again
- **Slow performance**: Browser automation takes 10-30 seconds per operation

### Login Detection Issues
- **Browser doesn't close after login** (Fixed Dec 2024): Update to latest version - Medium changed their UI selectors
- **Session file not created**: Ensure you complete the full login (see profile icon appear)
- **Debug login detection**: Run `npm run build && node dist/debug-login.js` to analyze current page selectors
- **Current selectors (Dec 2024)**:
  - User icon: `[data-testid="headerUserIcon"]`
  - Write button: `[data-testid="headerWriteButton"]`
  - Notifications: `[data-testid="headerNotificationButton"]`

### Medium UI Changes
- **Selectors outdated**: Medium occasionally changes their website structure
  - **Latest update**: December 2024 - Changed `headerUserButton` → `headerUserIcon`
  - **Solution**: Run debug script to find new selectors: `node dist/debug-login.js`
- **Login blocked**: Use your regular browser to login first, then try again

### Common Errors
- `Browser not initialized`: Restart the server
- `Login timeout`: Increase timeout in browser-client.ts (default: 5 minutes)
- `Element not found`: Medium may have changed their UI - check debug script output

## Development

### Project Structure
```
src/
├── index.ts           # Main MCP server
├── browser-client.ts  # Playwright automation
├── auth.ts           # Legacy auth (unused)
└── client.ts         # Legacy API client (unused)
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

# Build project
npm run build

# Run MCP server
npm start
```

**Test Coverage**:
- Session persistence and cookie validation
- Browser lifecycle management
- Authentication and session validation
- Headless mode switching

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

## Support
- 🐛 **Issues**: GitHub Issues
- 💬 **Discussions**: GitHub Discussions
- 📧 **Email**: [Contact Author]

## 🤖 CREDIT and DISCLAIMER

### AI-Powered Development
This entire Medium MCP Server was **developed by AI (Claude/Cursor AI) in just a few hours**, demonstrating the remarkable power of AI-assisted development. The complete rewrite from deprecated API to browser automation, including all TypeScript code, documentation, error handling, and testing strategies, was generated through AI collaboration.

### What This Demonstrates
- ✅ **AI-First Development**: Complex browser automation and MCP integration built rapidly
- ✅ **Real-world Problem Solving**: Adapted to Medium's API deprecation with working solution
- ✅ **Production-Ready Code**: TypeScript, error handling, session management, comprehensive docs
- ✅ **Community Standards**: Contributing guidelines, changelog, proper licensing

### Current Status & Limitations
- ✅ **Functional**: Works well in Claude MCP integration for core features
- ⚠️ **Google Login Sessions**: Couldn't solve persistent Google login sessions (use email/password instead)
- ⚠️ **Short Development Time**: Rapid development may have overlooked edge cases
- ⚠️ **Medium UI Changes**: Selectors may break if Medium updates their interface

### Honest Assessment
This tool is **useful and functional** for AI-powered content workflows, but comes with the inherent limitations of:
- **Rapid AI development** - may miss nuanced edge cases that human developers would catch
- **Browser automation complexity** - dependent on Medium's website structure
- **Session management challenges** - Google's anti-automation measures

### Feedback Welcome
Given the accelerated AI development process, **I welcome any feedback, bug reports, or improvements**. This serves as both a working tool and a demonstration of AI development capabilities and limitations.

**Use at your own discretion** - this is provided "as-is" with the understanding that rapid AI development, while powerful, may not cover all production scenarios.

---

**Note**: This is an unofficial tool and is not affiliated with Medium. Use responsibly and in accordance with Medium's Terms of Service.
