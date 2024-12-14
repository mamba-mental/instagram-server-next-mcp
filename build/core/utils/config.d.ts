import { type IServerConfig } from '../types/mcp.js';
/**
 * Configuration manager for the Instagram MCP server
 */
export declare class ConfigManager {
    private static instance;
    private config;
    private constructor();
    /**
     * Get singleton instance of ConfigManager
     */
    static getInstance(): ConfigManager;
    /**
     * Get current configuration
     */
    getConfig(): IServerConfig;
    /**
     * Load configuration from environment variables and defaults
     */
    private loadConfig;
    /**
     * Validate required environment variables
     */
    private validateEnvironment;
    /**
     * Update specific configuration values
     */
    updateConfig(partialConfig: Partial<IServerConfig>): void;
    /**
     * Reset configuration to defaults
     */
    resetConfig(): void;
    /**
     * Get tool configuration
     */
    getToolConfig<T>(toolName: string): T;
}
