/**
 * MCP server for Instagram integration
 */
export declare class InstagramMcpServer {
    private readonly server;
    private readonly instagramService;
    private readonly config;
    private transport;
    constructor();
    /**
     * Set up error handling
     */
    private setupErrorHandling;
    /**
     * Set up request handlers
     */
    private setupHandlers;
    /**
     * Start the server
     */
    run(): Promise<void>;
}
