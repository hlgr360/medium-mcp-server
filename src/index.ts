import { config } from 'dotenv';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BrowserMediumClient } from './browser-client';

// Load environment variables
config();

class MediumMcpServer {
  private server: McpServer;
  private mediumClient: BrowserMediumClient;

  constructor() {
    // Initialize browser-based Medium client
    this.mediumClient = new BrowserMediumClient();

    // Create MCP server instance
    this.server = new McpServer({
      name: "medium-mcp-server",
      version: "2.0.0"
    });

    this.registerTools();
  }

  private registerTools() {
    // Tool for publishing articles (now browser-based)
    this.server.tool(
      "publish-article",
      "Publish a new article on Medium using browser automation",
      {
        title: z.string().min(1, "Title is required"),
        content: z.string().min(10, "Content must be at least 10 characters"),
        tags: z.array(z.string()).optional(),
        isDraft: z.boolean().optional().default(false)
      },
      async (args) => {
        try {
          // Use withBrowserSession to manage browser lifecycle
          const publishResult = await this.withBrowserSession(async () => {
            return await this.mediumClient.publishArticle({
              title: args.title,
              content: args.content,
              tags: args.tags,
              isDraft: args.isDraft
            });
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(publishResult, null, 2)
              }
            ]
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error publishing article: ${error.message}`
              }
            ]
          };
        }
      }
    );

    // Tool for retrieving user's published articles
    this.server.tool(
      "get-my-articles",
      "Retrieve your published Medium articles",
      {},
      async () => {
        try {
          // Use withBrowserSession to manage browser lifecycle
          const articles = await this.withBrowserSession(async () => {
            return await this.mediumClient.getUserArticles();
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(articles, null, 2)
              }
            ]
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error retrieving articles: ${error.message}`
              }
            ]
          };
        }
      }
    );

    // Tool for getting full content of a specific article
    this.server.tool(
      "get-article-content",
      "Get the full content of a Medium article by URL",
      {
        url: z.string().url("Must be a valid URL"),
        requireLogin: z.boolean().optional().default(true).describe("Whether to attempt login for full content access")
      },
      async (args) => {
        try {
          // Use withBrowserSession to manage browser lifecycle
          const content = await this.withBrowserSession(async () => {
            return await this.mediumClient.getArticleContent(args.url, args.requireLogin);
          });

          return {
            content: [
              {
                type: "text",
                text: content
              }
            ]
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error retrieving article content: ${error.message}`
              }
            ]
          };
        }
      }
    );

    // Tool for searching Medium articles
    this.server.tool(
      "search-medium",
      "Search Medium for articles by keywords",
      {
        keywords: z.array(z.string()).min(1, "At least one keyword is required")
      },
      async (args) => {
        try {
          // Use withBrowserSession to manage browser lifecycle
          const articles = await this.withBrowserSession(async () => {
            return await this.mediumClient.searchMediumArticles(args.keywords);
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(articles, null, 2)
              }
            ]
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error searching articles: ${error.message}`
              }
            ]
          };
        }
      }
    );

    // Tool to manually trigger login (useful for initial setup)
    this.server.tool(
      "login-to-medium",
      "Manually trigger Medium login process. Browser will open visibly for login.",
      {},
      async () => {
        try {
          // Force non-headless mode for login so user can interact
          await this.mediumClient.initialize(false);
          console.error('🌐 Browser opened for login (non-headless)');

          const success = await this.mediumClient.ensureLoggedIn();

          // Close browser after login
          await this.mediumClient.close();
          console.error('🔒 Browser closed after login');

          return {
            content: [
              {
                type: "text",
                text: success
                  ? "✅ Successfully logged in to Medium. Session saved for future use."
                  : "❌ Login failed. Please try again."
              }
            ]
          };
        } catch (error: any) {
          // Ensure browser is closed even if login fails
          await this.mediumClient.close();

          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Login error: ${error.message}`
              }
            ]
          };
        }
      }
    );
  }

  /**
   * Wrapper to manage browser lifecycle for each MCP tool invocation.
   * Ensures browser is initialized, session is validated, and browser is closed after operation.
   * @param operation - The async operation to execute with an initialized browser
   * @returns The result of the operation
   */
  private async withBrowserSession<T>(operation: () => Promise<T>): Promise<T> {
    try {
      // Initialize browser (will use headless mode if valid session exists)
      await this.mediumClient.initialize();
      console.error('🌐 Browser initialized for operation');

      // Validate session fast (5s check vs 21s DOM selector check)
      const isValid = await this.mediumClient.validateSessionFast();
      if (!isValid) {
        console.error('🔐 Session invalid or missing, attempting login...');
        await this.mediumClient.ensureLoggedIn();
      }

      // Execute the operation
      console.error('⚙️  Executing operation...');
      return await operation();
    } finally {
      // CRITICAL: Always close browser after operation to free resources
      console.error('🔒 Closing browser after operation');
      await this.mediumClient.close();
    }
  }

  // Method to start the server
  async start() {
    try {
      // Browser will be initialized on-demand for each tool invocation
      // This saves resources and allows session validation before operations

      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      console.error("🚀 Medium MCP Server (Browser-based) Initialized");
      console.error("💡 Browser will launch on-demand for each operation");
      console.error("💡 Use 'login-to-medium' tool first if you don't have a saved session");
    } catch (error) {
      console.error("Failed to start server:", error);
      throw error;
    }
  }

  // Cleanup method
  async cleanup() {
    await this.mediumClient.close();
  }
}

// Main execution
async function main() {
  const server = new MediumMcpServer();
  
  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.error("🛑 Shutting down Medium MCP Server...");
    await server.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.error("🛑 Shutting down Medium MCP Server...");
    await server.cleanup();
    process.exit(0);
  });

  await server.start();
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
