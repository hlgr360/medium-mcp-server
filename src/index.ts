import { config } from 'dotenv';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { BrowserMediumClient } from './browser-client';
import { logger } from './logger';

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
      version: "1.3.0"
    });

    this.registerTools();
  }

  private registerTools() {
    // Tool for creating article drafts (browser-based)
    this.server.tool(
      "publish-article",
      "Create a new article draft on Medium using browser automation",
      {
        title: z.string().min(1, "Title is required"),
        content: z.string().min(10, "Content must be at least 10 characters"),
        tags: z.array(z.string()).optional()
      },
      async (args) => {
        try {
          // Use withBrowserSession to manage browser lifecycle
          const publishResult = await this.withBrowserSession(async () => {
            return await this.mediumClient.publishArticle({
              title: args.title,
              content: args.content,
              tags: args.tags,
              isDraft: true  // Always save as draft (publish flow not implemented)
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
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error publishing article: ${error instanceof Error ? error.message : String(error)}`
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
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error retrieving articles: ${error instanceof Error ? error.message : String(error)}`
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
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error retrieving article content: ${error instanceof Error ? error.message : String(error)}`
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
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error searching articles: ${error instanceof Error ? error.message : String(error)}`
              }
            ]
          };
        }
      }
    );

    // Tool for retrieving Medium feed articles
    this.server.tool(
      "get-feed",
      "Retrieve article headers from a Medium feed (Featured, For You, Following, or All)",
      {
        category: z.enum(['featured', 'for-you', 'following', 'all'])
          .describe("Feed category: 'featured', 'for-you', 'following', or 'all' (fetches from all feeds with articles tagged by source)"),
        limit: z.number()
          .int()
          .positive()
          .max(50)
          .optional()
          .default(10)
          .describe("Maximum number of articles per feed to return (default: 10, max: 50). When using 'all', returns up to limit*3 articles.")
      },
      async (args) => {
        try {
          const articles = await this.withBrowserSession(async () => {
            return await this.mediumClient.getFeed(args.category, args.limit);
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(articles, null, 2)
              }
            ]
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error retrieving feed: ${error instanceof Error ? error.message : String(error)}`
              }
            ]
          };
        }
      }
    );

    // Tool for retrieving user's reading lists
    this.server.tool(
      "get-lists",
      "Retrieve your saved Medium reading lists with metadata",
      {},
      async () => {
        try {
          const lists = await this.withBrowserSession(async () => {
            return await this.mediumClient.getLists();
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(lists, null, 2)
              }
            ]
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error retrieving lists: ${error instanceof Error ? error.message : String(error)}`
              }
            ]
          };
        }
      }
    );

    // Tool for retrieving articles from a specific list
    this.server.tool(
      "get-list-articles",
      "Retrieve article headers from a specific Medium reading list",
      {
        listId: z.string()
          .min(1, "List ID is required")
          .describe("The ID of the reading list (get from get-lists tool)"),
        limit: z.number()
          .int()
          .positive()
          .max(50)
          .optional()
          .default(10)
          .describe("Maximum number of articles to return (default: 10, max: 50)")
      },
      async (args) => {
        try {
          const articles = await this.withBrowserSession(async () => {
            return await this.mediumClient.getListArticles(args.listId, args.limit);
          });

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(articles, null, 2)
              }
            ]
          };
        } catch (error) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error retrieving list articles: ${error instanceof Error ? error.message : String(error)}`
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
          logger.info('🌐 Browser opened for login (non-headless)');

          const success = await this.mediumClient.ensureLoggedIn();

          // Close browser after login
          await this.mediumClient.close();
          logger.info('🔒 Browser closed after login');

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
        } catch (error) {
          // Ensure browser is closed even if login fails
          await this.mediumClient.close();

          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Login error: ${error instanceof Error ? error.message : String(error)}`
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
      logger.info('🌐 Browser initialized for operation');

      // Validate session fast (5s check vs 21s DOM selector check)
      const isValid = await this.mediumClient.validateSessionFast();
      if (!isValid) {
        logger.warn('🔐 Session invalid or missing, attempting login...');
        await this.mediumClient.ensureLoggedIn();
      }

      // Execute the operation
      logger.info('⚙️  Executing operation...');
      return await operation();
    } finally {
      // CRITICAL: Always close browser after operation to free resources
      logger.info('🔒 Closing browser after operation');
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
      logger.info("🚀 Medium MCP Server (Browser-based) Initialized");
      logger.info("💡 Browser will launch on-demand for each operation");
      logger.info("💡 Use 'login-to-medium' tool first if you don't have a saved session");
    } catch (error) {
      logger.error("Failed to start server:", error);
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
    logger.info("🛑 Shutting down Medium MCP Server...");
    await server.cleanup();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.info("🛑 Shutting down Medium MCP Server...");
    await server.cleanup();
    process.exit(0);
  });

  await server.start();
}

main().catch(error => {
  logger.error("Fatal error:", error);
  process.exit(1);
});
