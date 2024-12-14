#!/usr/bin/env node
import { InstagramMcpServer } from './server.js';
import { McpError, ErrorCode } from './core/mcp/index.js';
process.on('uncaughtException', (error) => {
    console.error('FATAL: Uncaught exception:', error);
    if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
    }
    process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('FATAL: Unhandled rejection at:', promise, 'reason:', reason);
    process.exit(1);
});
async function main() {
    try {
        console.error('DEBUG: Starting main function...');
        const CHROME_USER_DATA_DIR = process.env.CHROME_USER_DATA_DIR;
        console.error('DEBUG: CHROME_USER_DATA_DIR:', CHROME_USER_DATA_DIR);
        if (!CHROME_USER_DATA_DIR) {
            throw new McpError(ErrorCode.InvalidRequest, 'CHROME_USER_DATA_DIR environment variable is required');
        }
        // Create and run server
        console.error('DEBUG: Creating InstagramMcpServer instance...');
        const server = new InstagramMcpServer();
        console.error('DEBUG: InstagramMcpServer instance created');
        console.error('DEBUG: Starting server...');
        await server.run();
        console.error('DEBUG: Server started successfully');
        // Keep the process alive
        process.stdin.resume();
        console.error('DEBUG: Process kept alive for stdin');
        // Handle graceful shutdown
        process.on('SIGINT', async () => {
            console.error('DEBUG: Received SIGINT, shutting down...');
            process.exit(0);
        });
        process.on('SIGTERM', async () => {
            console.error('DEBUG: Received SIGTERM, shutting down...');
            process.exit(0);
        });
    }
    catch (error) {
        console.error('FATAL: Failed to start Instagram MCP server:', error);
        if (error instanceof Error) {
            console.error('Stack trace:', error.stack);
        }
        process.exit(1);
    }
}
main().catch(error => {
    console.error('FATAL: Unhandled error in main:', error);
    if (error instanceof Error) {
        console.error('Stack trace:', error.stack);
    }
    process.exit(1);
});
//# sourceMappingURL=index.js.map