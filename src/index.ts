#!/usr/bin/env node
import { InstagramMcpServer } from './server.js';
import { McpError, ErrorCode } from './core/mcp/index.js';

let server: InstagramMcpServer | null = null;

process.on('uncaughtException', async (error) => {
  console.error('Error:', error);
  if (server) {
    await server.close();
  }
  process.exit(1);
});

process.on('unhandledRejection', async (reason, promise) => {
  console.error('Unhandled rejection:', reason);
  if (server) {
    await server.close();
  }
  process.exit(1);
});

async function main() {
  try {
    const CHROME_USER_DATA_DIR = process.env.CHROME_USER_DATA_DIR;
    
    if (!CHROME_USER_DATA_DIR) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        'CHROME_USER_DATA_DIR environment variable is required'
      );
    }

    server = new InstagramMcpServer();
    await server.run();

    // Keep the process alive
    process.stdin.resume();

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      if (server) {
        await server.close();
      }
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      if (server) {
        await server.close();
      }
      process.exit(0);
    });

  } catch (error) {
    console.error('Error:', error);
    if (server) {
      await server.close();
    }
    process.exit(1);
  }
}

main().catch(async error => {
  console.error('Error:', error);
  if (server) {
    await server.close();
  }
  process.exit(1);
});
