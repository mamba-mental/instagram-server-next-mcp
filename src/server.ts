import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { InstagramService } from './features/instagram/instagram.service.js';
import { ConfigManager } from './core/utils/config.js';
import { ErrorHandler } from './core/utils/errors.js';
import { IProgressUpdate } from './features/instagram/types.js';

const BATCH_SIZE = 3; // Match service batch size
const PROGRESS_INTERVAL = 45000; // 45 seconds between updates

export class InstagramMcpServer {
  private readonly server: Server;
  private readonly instagramService: InstagramService;
  private readonly config = ConfigManager.getInstance().getConfig();
  private transport: StdioServerTransport | null = null;
  private lastProgressUpdate = 0;

  constructor() {
    this.server = new Server(
      {
        name: this.config.name,
        version: this.config.version
      },
      {
        capabilities: {
          tools: {
            get_instagram_posts: {
              defaultSaveDir: this.config.instagram.defaultSaveDir,
              postsLogFile: this.config.instagram.postsLogFile,
              defaultDelay: this.config.instagram.defaultDelay,
              maxPostsPerBatch: BATCH_SIZE,
              batchBreakDelay: this.config.instagram.batchBreakDelay,
              minDelay: this.config.instagram.minDelay,
              chromeUserDataDir: this.config.chromeUserDataDir
            }
          }
        }
      }
    );
    
    this.instagramService = new InstagramService();
    this.setupHandlers();
  }

  private shouldSendProgress(keepAlive: boolean): boolean {
    const now = Date.now();
    if (!keepAlive) return true;
    if (now - this.lastProgressUpdate >= PROGRESS_INTERVAL) {
      this.lastProgressUpdate = now;
      return true;
    }
    return false;
  }

  private sendProgress(message: string | IProgressUpdate): void {
    if (!this.transport) return;

    const update = typeof message === 'string' ? 
      { message, keepAlive: false } : 
      {
        message: message.message,
        progress: message.progress,
        total: message.total,
        keepAlive: message.keepAlive ?? false
      };

    if (this.shouldSendProgress(update.keepAlive)) {
      this.transport.send({
        jsonrpc: '2.0',
        method: 'progress',
        params: update
      });
    }
  }

  private setupHandlers(): void {
    this.server.setRequestHandler(
      ListToolsRequestSchema,
      async () => ({
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
                  description: `Number of posts to fetch (1-${BATCH_SIZE}) or "all" for continuous batches`,
                },
                startFrom: {
                  type: 'number',
                  description: 'Index to start fetching from (for pagination)',
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
      })
    );

    this.server.setRequestHandler(
      CallToolRequestSchema,
      async (request) => {
        if (request.params.name !== 'get_instagram_posts') {
          throw ErrorHandler.methodNotFound(request.params.name);
        }

        const args = request.params.arguments || {};
        
        if (!args.username || typeof args.username !== 'string') {
          throw ErrorHandler.invalidParams('Username is required and must be a string');
        }

        try {
          const startFrom = typeof args.startFrom === 'number' ? args.startFrom : 0;
          const limit = args.limit === 'all' ? BATCH_SIZE : Math.min(Number(args.limit || BATCH_SIZE), BATCH_SIZE);

          const posts = await this.instagramService.fetchPosts(
            args.username,
            limit,
            startFrom,
            (message) => this.sendProgress(message)
          );

          const response = {
            posts,
            pagination: {
              currentBatch: {
                start: startFrom,
                end: startFrom + posts.length,
                size: posts.length
              },
              nextStartFrom: startFrom + posts.length,
              hasMore: posts.length === BATCH_SIZE
            }
          };

          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(response, null, 2)
              }
            ],
            keepAlive: response.pagination.hasMore
          };
        } catch (error) {
          throw ErrorHandler.toMcpError(error);
        }
      }
    );
  }

  public async run(): Promise<void> {
    try {
      this.transport = new StdioServerTransport();

      this.server.onerror = (error) => {
        console.error('Server error:', error);
      };

      process.stdin.on('end', () => {
        this.close().catch(console.error);
      });

      process.stdin.on('error', (error) => {
        this.close().catch(console.error);
      });
      
      await this.server.connect(this.transport);

      process.on('SIGINT', async () => {
        await this.close();
        process.exit(0);
      });

      process.on('SIGTERM', async () => {
        await this.close();
        process.exit(0);
      });
    } catch (error) {
      throw error;
    }
  }

  public async close(): Promise<void> {
    try {
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }
      await this.server.close();
    } catch (error) {
      throw error;
    }
  }
}
