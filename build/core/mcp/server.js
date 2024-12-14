import { McpError, ErrorCode, } from '../types/mcp.js';
import { StdioServerTransport } from './stdio.js';
/**
 * MCP Server implementation
 */
export class Server {
    constructor(config) {
        this.config = config;
        this.handlers = new Map();
        this.transport = null;
        this.methodToSchema = new Map();
        this.isConnected = false;
    }
    /**
     * Connect to a transport
     */
    async connect(transport) {
        try {
            if (this.isConnected) {
                console.error('DEBUG: Server already connected');
                return;
            }
            console.error('DEBUG: Connecting to transport...');
            if (transport instanceof StdioServerTransport) {
                console.error('DEBUG: Setting server on StdioServerTransport...');
                transport.setServer(this);
            }
            this.transport = transport;
            console.error('DEBUG: Initializing transport connection...');
            await transport.connect();
            this.isConnected = true;
            console.error('DEBUG: Server successfully connected to transport');
            // Keep the process alive
            process.stdin.resume();
            console.error('DEBUG: Process kept alive for stdin');
            // Handle process termination
            process.on('SIGINT', async () => {
                console.error('DEBUG: Received SIGINT signal');
                await this.close();
                process.exit(0);
            });
            process.on('SIGTERM', async () => {
                console.error('DEBUG: Received SIGTERM signal');
                await this.close();
                process.exit(0);
            });
        }
        catch (error) {
            console.error('DEBUG: Error connecting to transport:', error);
            this.handleError(error);
            throw error;
        }
    }
    /**
     * Close the server and transport
     */
    async close() {
        if (this.transport) {
            try {
                console.error('DEBUG: Closing transport...');
                await this.transport.close();
                this.transport = null;
                this.isConnected = false;
                console.error('DEBUG: Transport closed successfully');
            }
            catch (error) {
                console.error('DEBUG: Error closing transport:', error);
                this.handleError(error);
                throw error;
            }
        }
    }
    /**
     * Set a request handler for a specific schema
     */
    setRequestHandler(schema, handler, method) {
        console.error('DEBUG: Setting request handler for schema:', schema.toString());
        if (this.handlers.has(schema)) {
            throw new McpError(ErrorCode.InvalidRequest, `Handler already registered for schema: ${schema.toString()}`);
        }
        this.handlers.set(schema, handler);
        console.error('DEBUG: Handler set for schema:', schema.toString());
        // Map method name to schema if provided
        if (method) {
            console.error('DEBUG: Mapping method to schema:', method);
            this.methodToSchema.set(method, schema);
            this.handlers.set(method, handler);
            console.error('DEBUG: Method mapped to schema:', method);
        }
    }
    /**
     * Get a handler by schema or method name
     */
    getHandler(key) {
        console.error('DEBUG: Getting handler for key:', typeof key === 'string' ? key : key.toString());
        if (typeof key === 'string') {
            // Try direct method lookup first
            const handler = this.handlers.get(key);
            if (handler) {
                console.error('DEBUG: Found handler for method:', key);
                return handler;
            }
            // Try schema lookup through method mapping
            const schema = this.methodToSchema.get(key);
            if (schema) {
                const handler = this.handlers.get(schema);
                console.error('DEBUG: Found handler for schema through method mapping:', key);
                return handler;
            }
        }
        const handler = this.handlers.get(key);
        if (handler) {
            console.error('DEBUG: Found handler for schema:', typeof key === 'string' ? key : key.toString());
        }
        else {
            console.error('DEBUG: No handler found for key:', typeof key === 'string' ? key : key.toString());
        }
        return handler;
    }
    /**
     * Handle an error
     */
    handleError(error) {
        console.error('DEBUG: Handling error:', error);
        const mcpError = error instanceof McpError
            ? error
            : new McpError(ErrorCode.InternalError, error instanceof Error ? error.message : String(error));
        if (this.onerror) {
            console.error('DEBUG: Calling error handler');
            this.onerror(mcpError);
        }
        else {
            console.error('DEBUG: [MCP Error]', mcpError);
        }
    }
    /**
     * Get server configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Check if server is connected
     */
    isServerConnected() {
        return this.isConnected;
    }
}
//# sourceMappingURL=server.js.map