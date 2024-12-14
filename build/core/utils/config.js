import path from 'path';
import { ErrorCode, McpError } from '../types/mcp.js';
/**
 * Configuration manager for the Instagram MCP server
 */
export class ConfigManager {
    constructor() {
        this.config = this.loadConfig();
    }
    /**
     * Get singleton instance of ConfigManager
     */
    static getInstance() {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }
    /**
     * Get current configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Load configuration from environment variables and defaults
     */
    loadConfig() {
        const env = this.validateEnvironment();
        const defaultSaveDir = path.join('/Users/ryan/CursorCode/pinkink', 'instagram_data');
        return {
            name: 'instagram-server',
            version: '0.2.0',
            chromeUserDataDir: env.CHROME_USER_DATA_DIR,
            browser: {
                headless: true,
                windowWidth: 1280,
                windowHeight: 800,
                defaultTimeout: 10000,
                navigationTimeout: 30000,
            },
            instagram: {
                defaultSaveDir,
                postsLogFile: path.join(defaultSaveDir, 'fetched_posts.json'),
                defaultDelay: 5000, // Increased to 5 seconds between posts
                maxPostsPerBatch: 25, // Reduced batch size
                batchBreakDelay: 60000, // Increased to 1 minute break between batches
                minDelay: 3000, // Increased minimum delay
            },
            capabilities: {
                tools: {
                    get_instagram_posts: {
                        defaultSaveDir,
                        postsLogFile: path.join(defaultSaveDir, 'fetched_posts.json'),
                        defaultDelay: 5000, // Increased to 5 seconds between posts
                        maxPostsPerBatch: 25, // Reduced batch size
                        batchBreakDelay: 60000, // Increased to 1 minute break between batches
                        minDelay: 3000, // Increased minimum delay
                        chromeUserDataDir: env.CHROME_USER_DATA_DIR,
                    },
                },
            },
        };
    }
    /**
     * Validate required environment variables
     */
    validateEnvironment() {
        const requiredVars = ['CHROME_USER_DATA_DIR'];
        const env = { ...process.env };
        for (const varName of requiredVars) {
            if (!env[varName]) {
                throw new McpError(ErrorCode.InvalidRequest, `Missing required environment variable: ${varName}`);
            }
        }
        return env;
    }
    /**
     * Update specific configuration values
     */
    updateConfig(partialConfig) {
        this.config = {
            ...this.config,
            ...partialConfig,
            browser: {
                ...this.config.browser,
                ...partialConfig.browser,
            },
            instagram: {
                ...this.config.instagram,
                ...partialConfig.instagram,
            },
            capabilities: {
                ...this.config.capabilities,
                ...partialConfig.capabilities,
            },
        };
    }
    /**
     * Reset configuration to defaults
     */
    resetConfig() {
        this.config = this.loadConfig();
    }
    /**
     * Get tool configuration
     */
    getToolConfig(toolName) {
        const toolConfig = this.config.capabilities?.tools?.[toolName];
        if (!toolConfig) {
            throw new McpError(ErrorCode.InvalidRequest, `Tool configuration not found: ${toolName}`);
        }
        return toolConfig;
    }
}
//# sourceMappingURL=config.js.map