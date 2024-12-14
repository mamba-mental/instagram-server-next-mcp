export declare class InstagramMcpServer {
    private readonly server;
    private readonly instagramService;
    private readonly config;
    private transport;
    private lastProgressUpdate;
    constructor();
    private shouldSendProgress;
    private sendProgress;
    private setupHandlers;
    run(): Promise<void>;
    close(): Promise<void>;
}
