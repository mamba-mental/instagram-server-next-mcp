import { type ITransport } from '../types/mcp.js';
import { Server } from './server.js';
/**
 * StdioServerTransport implementation for MCP
 * Handles communication over standard input/output using JSON-RPC 2.0
 */
export declare class StdioServerTransport implements ITransport {
    private isConnected;
    private messageBuffer;
    private server;
    /**
     * Connect to stdin/stdout
     */
    connect(): Promise<void>;
    /**
     * Close the transport
     */
    close(): Promise<void>;
    /**
     * Set the server instance
     */
    setServer(server: Server): void;
    /**
     * Handle input from stdin
     */
    private handleInput;
    /**
     * Handle a JSON-RPC request
     */
    private handleRequest;
    /**
     * Send a successful response
     */
    private sendResult;
    /**
     * Send an error response
     */
    private sendError;
    /**
     * Send a message over stdout
     */
    private send;
}
