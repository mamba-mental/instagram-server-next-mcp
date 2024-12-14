import { McpError } from '../types/mcp.js';
/**
 * Custom error types for the Instagram MCP server
 */
export declare class InstagramError extends Error {
    constructor(message: string);
}
export declare class BrowserError extends Error {
    constructor(message: string);
}
export declare class FileSystemError extends Error {
    constructor(message: string);
}
/**
 * Error handling utilities
 */
export declare class ErrorHandler {
    /**
     * Convert any error to an MCP error
     */
    static toMcpError(error: unknown): McpError;
    /**
     * Create an MCP error for invalid parameters
     */
    static invalidParams(message: string): McpError;
    /**
     * Create an MCP error for method not found
     */
    static methodNotFound(method: string): McpError;
    /**
     * Create an MCP error for internal errors
     */
    static internal(message: string): McpError;
}
/**
 * Class decorator for handling async errors
 */
export declare function handleClassAsyncErrors<T extends {
    new (...args: any[]): {};
}>(constructor: T): {
    new (...args: any[]): {};
} & T;
/**
 * Method decorator for handling async errors
 */
export declare function handleAsyncErrors(target: any, propertyKey: string, descriptor: PropertyDescriptor): PropertyDescriptor;
