var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { Server, StdioServerTransport, CallToolRequestSchema, ListToolsRequestSchema, RPC_METHODS, ErrorHandler, handleClassAsyncErrors, } from './core/mcp/index.js';
import { InstagramService } from './features/instagram/instagram.service.js';
import { ConfigManager } from './core/utils/config.js';
/**
 * MCP server for Instagram integration
 */
let InstagramMcpServer = class InstagramMcpServer {
    constructor() {
        this.transport = null;
        console.error('DEBUG: Starting InstagramMcpServer constructor...');
        try {
            console.error('DEBUG: Getting config from ConfigManager...');
            this.config = ConfigManager.getInstance().getConfig();
            console.error('DEBUG: Got config:', JSON.stringify(this.config, null, 2));
            console.error('DEBUG: Creating Server instance...');
            this.server = new Server(this.config);
            console.error('DEBUG: Server instance created');
            console.error('DEBUG: Creating InstagramService instance...');
            this.instagramService = new InstagramService();
            console.error('DEBUG: InstagramService instance created');
            console.error('DEBUG: Setting up handlers...');
            this.setupHandlers();
            console.error('DEBUG: Handlers set up');
            console.error('DEBUG: Setting up error handling...');
            this.setupErrorHandling();
            console.error('DEBUG: Error handling set up');
        }
        catch (error) {
            console.error('DEBUG: Error in constructor:', error);
            throw error;
        }
        console.error('DEBUG: InstagramMcpServer constructor completed');
    }
    /**
     * Set up error handling
     */
    setupErrorHandling() {
        this.server.onerror = (error) => {
            console.error('DEBUG: [MCP Error]', error);
        };
        process.on('SIGINT', async () => {
            console.error('DEBUG: Received SIGINT signal');
            if (this.transport) {
                await this.transport.close();
            }
            await this.server.close();
            process.exit(0);
        });
    }
    /**
     * Set up request handlers
     */
    setupHandlers() {
        // List available tools
        console.error('DEBUG: Setting up ListTools handler...');
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            console.error('DEBUG: Handling ListTools request');
            return {
                tools: [
                    {
                        name: 'get_instagram_posts',
                        description: 'Get recent posts from an Instagram profile using existing Chrome login',
                        inputSchema: {
                            type: 'object',
                            properties: {
                                username: {
                                    type: 'string',
                                    description: 'Instagram username to fetch posts from',
                                },
                                limit: {
                                    type: ['number', 'string'],
                                    description: 'Number of posts to fetch (1-50) or "all" for all posts',
                                },
                                saveDir: {
                                    type: 'string',
                                    description: 'Directory to save media files and metadata (optional)',
                                },
                                delayBetweenPosts: {
                                    type: 'number',
                                    description: 'Milliseconds to wait between processing posts (optional)',
                                },
                            },
                            required: ['username'],
                        },
                    },
                ],
            };
        }, RPC_METHODS.LIST_TOOLS);
        console.error('DEBUG: ListTools handler set up');
        // Handle tool calls
        console.error('DEBUG: Setting up CallTool handler...');
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            console.error('DEBUG: Handling CallTool request:', request.params.name);
            if (request.params.name !== 'get_instagram_posts') {
                throw ErrorHandler.methodNotFound(request.params.name);
            }
            const args = request.params.arguments || {};
            if (!args.username || typeof args.username !== 'string') {
                throw ErrorHandler.invalidParams('Username is required and must be a string');
            }
            try {
                console.error('DEBUG: Fetching posts for username:', args.username);
                const posts = await this.instagramService.fetchPosts(args.username, args.limit);
                console.error('DEBUG: Successfully fetched posts');
                return {
                    content: [
                        {
                            type: 'text',
                            text: JSON.stringify(posts, null, 2),
                        },
                    ],
                };
            }
            catch (error) {
                console.error('DEBUG: Error fetching posts:', error);
                throw ErrorHandler.toMcpError(error);
            }
        }, RPC_METHODS.CALL_TOOL);
        console.error('DEBUG: CallTool handler set up');
    }
    /**
     * Start the server
     */
    async run() {
        try {
            console.error('DEBUG: Starting server run...');
            console.error('DEBUG: Chrome user data directory:', this.config.chromeUserDataDir);
            console.error('DEBUG: Default save directory:', this.config.instagram.defaultSaveDir);
            console.error('DEBUG: Creating StdioServerTransport...');
            this.transport = new StdioServerTransport();
            console.error('DEBUG: Setting server on transport...');
            this.transport.setServer(this.server);
            console.error('DEBUG: Connecting transport...');
            await this.transport.connect();
            console.error('DEBUG: Instagram MCP server running on stdio');
            // Keep the process alive
            process.stdin.resume();
            console.error('DEBUG: Process kept alive for stdin');
        }
        catch (error) {
            console.error('DEBUG: Failed to start server:', error);
            if (error instanceof Error) {
                console.error('DEBUG: Error stack:', error.stack);
            }
            throw error;
        }
    }
};
InstagramMcpServer = __decorate([
    handleClassAsyncErrors,
    __metadata("design:paramtypes", [])
], InstagramMcpServer);
export { InstagramMcpServer };
//# sourceMappingURL=server.js.map