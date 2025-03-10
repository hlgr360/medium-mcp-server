import { config } from 'dotenv';
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import MediumAuth from './auth';
import MediumClient from './client';

// Load environment variables
config();

class MediumMcpServer {
  private server: McpServer;
  private mediumClient: MediumClient;
  private auth: MediumAuth;

  constructor() {
    // Initialize authentication
    this.auth = new MediumAuth();
    
    // Initialize Medium client
    this.mediumClient = new MediumClient(this.auth);

    // Create MCP server instance
    this.server = new McpServer({
      name: "medium-mcp-server",
      version: "1.0.0"
    });

    this.registerTools();
  }

  private registerTools() {
    // Tool for publishing articles
    this.server.tool(
      "publish-article",
      "Publish a new article on Medium",
      {
        title: z.string().min(1, "Title is required"),
        content: z.string().min(10, "Content must be at least 10 characters"),
        tags: z.array(z.string()).optional(),
        publicationId: z.string().optional()
      },
      async (args) => {
        try {
          const publishResult = await this.mediumClient.publishArticle({
            title: args.title,
            content: args.content,
            tags: args.tags,
            publicationId: args.publicationId
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

    // Tool for retrieving user publications
    this.server.tool(
      "get-publications",
      "Retrieve user's publications",
      {},
      async () => {
        try {
          const publications = await this.mediumClient.getUserPublications();

          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(publications, null, 2)
              }
            ]
          };
        } catch (error: any) {
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Error retrieving publications: ${error.message}`
              }
            ]
          };
        }
      }
    );

    // Tool for searching articles
    this.server.tool(
      "search-articles",
      "Search and filter Medium articles",
      {
        keywords: z.array(z.string()).optional(),
        publicationId: z.string().optional(),
        tags: z.array(z.string()).optional()
      },
      async (args) => {
        try {
          const articles = await this.mediumClient.searchArticles({
            keywords: args.keywords,
            publicationId: args.publicationId,
            tags: args.tags
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
  }

  // Method to start the server
  async start() {
    // Authenticate first
    await this.auth.authenticate();

    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("🚀 MediumMCP Server Initialized");
  }
}

// Main execution
async function main() {
  const server = new MediumMcpServer();
  await server.start();
}

main().catch(error => {
  console.error("Fatal error:", error);
  process.exit(1);
});
