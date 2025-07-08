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
git clone https://github.com/YOUR_USERNAME/medium-mcp-server.git

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
1. **Run the server** - It will open a Chrome browser window
2. **Login to Medium** - Complete login in the opened browser
3. **Session saved** - Your login session is saved locally
4. **Future runs** - No login required, runs headlessly

### Browser Automation Flow
```
User Request → MCP Server → Playwright Browser → Medium Website → Response
```

### Session Management
- Login session stored in `medium-session.json`
- Automatically reused on subsequent runs
- Re-login only if session expires

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

### Medium Changes
- **Selectors outdated**: Medium occasionally changes their website structure
- **Login blocked**: Use your regular browser to login first, then try again

### Common Errors
- `Browser not initialized`: Restart the server
- `Login timeout`: Increase timeout in browser-client.ts
- `Element not found`: Medium may have changed their UI

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
# Test browser automation
node test-browser.js

# Run MCP server
npm start

# Build project
npm run build
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

## Support
- 🐛 **Issues**: GitHub Issues
- 💬 **Discussions**: GitHub Discussions
- 📧 **Email**: [Contact Author]

---

**Note**: This is an unofficial tool and is not affiliated with Medium. Use responsibly and in accordance with Medium's Terms of Service.
