# Configuration Examples

This directory contains example configuration files for integrating the Medium MCP Server with various AI assistants and tools.

## Available Examples

### 📘 claude-desktop-config-example.json

**For**: Claude Desktop users (macOS, Windows, Linux)

**Purpose**: Shows how to configure the Medium MCP Server in Claude Desktop's MCP configuration file.

**Location of actual config file**:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

**What to customize**:
1. Replace `/absolute/path/to/medium-mcp-server` with your actual installation path
2. Ensure you use **absolute paths** (not relative paths like `~/`)
3. Point to the built `dist/index.js` file

**Example**:
```json
{
  "mcpServers": {
    "medium-mcp": {
      "command": "node",
      "args": ["/Users/yourusername/repos/medium-mcp-server/dist/index.js"]
    }
  }
}
```

See the [full example file](./claude-desktop-config-example.json) for complete configuration.

---

## Usage Instructions

### Step 1: Build the Project

Before configuring, ensure the project is built:

```bash
cd /path/to/medium-mcp-server
npm install
npm run build
```

### Step 2: Find Your Installation Path

Get the absolute path to your installation:

```bash
# macOS/Linux
pwd
# Should output something like: /Users/yourusername/repos/medium-mcp-server

# Windows (PowerShell)
pwd
# Should output something like: C:\Users\yourusername\repos\medium-mcp-server
```

### Step 3: Update Claude Desktop Configuration

1. Copy the example configuration from `claude-desktop-config-example.json`
2. Replace `/absolute/path/to/medium-mcp-server` with your actual path
3. Open Claude Desktop's config file:
   - **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
   - **Linux**: `~/.config/Claude/claude_desktop_config.json`
4. Add or merge the configuration
5. Restart Claude Desktop

### Step 4: Verify Installation

After restarting Claude Desktop, the Medium MCP Server should appear in the available tools. You can verify by asking Claude:

```
"What MCP servers do you have access to?"
```

---

## Common Issues

### Issue: "Command not found" or "Module not found"

**Cause**: Path is incorrect or project not built

**Solution**:
1. Verify the path is absolute (starts with `/` on macOS/Linux or `C:\` on Windows)
2. Ensure `dist/index.js` exists: `ls dist/index.js` (or `dir dist\index.js` on Windows)
3. Rebuild if needed: `npm run build`

### Issue: MCP server not appearing in Claude Desktop

**Cause**: Configuration file syntax error or Claude Desktop not restarted

**Solution**:
1. Validate JSON syntax (no trailing commas, proper quotes)
2. Check Claude Desktop logs: `tail -f ~/Library/Logs/Claude/mcp*.log`
3. Restart Claude Desktop completely

### Issue: "Working directory may be /"

**Cause**: The `cwd` parameter is not reliable in Claude Desktop

**Solution**: Use **absolute paths** in the `args` array, never relative paths

---

## Additional Resources

- [Main README](../README.md) - Installation and usage guide
- [AGENTS.md](../AGENTS.md) - Comprehensive development guide
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Contribution guidelines
- [Troubleshooting Section](../README.md#troubleshooting) - Common debugging steps

---

## Need Help?

If you encounter issues:

1. Check the [troubleshooting section](../README.md#troubleshooting) in the main README
2. Review Claude Desktop logs for error messages
3. Open an issue on GitHub with:
   - Your OS and Claude Desktop version
   - Configuration file contents (with sensitive paths redacted)
   - Relevant log excerpts
