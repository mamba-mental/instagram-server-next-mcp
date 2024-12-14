import { type IServer, type IServerConfig, type ITransport, type IRequestHandler } from '../types/mcp.js';
/**
 * MCP Server implementation
 */
export declare class Server implements IServer {
    private readonly config;
    private handlers;
    private transport;
    private methodToSchema;
    private isConnected;
    onerror?: (error: Error) => void;
    constructor(config: IServerConfig);
    /**
     * Connect to a transport
     */
    connect(transport: ITransport): Promise<void>;
    /**
     * Close the server and transport
     */
    close(): Promise<void>;
    /**
     * Set a request handler for a specific schema
     */
    setRequestHandler<T = unknown, R = unknown>(schema: symbol, handler: IRequestHandler<T, R>, method?: string): void;
    /**
     * Get a handler by schema or method name
     */
    getHandler(key: symbol | string): IRequestHandler<unknown, unknown> | undefined;
    /**
     * Handle an error
     */
    private handleError;
    /**
     * Get server configuration
     */
    getConfig(): IServerConfig;
    /**
     * Check if server is connected
     */
    isServerConnected(): boolean;
}
