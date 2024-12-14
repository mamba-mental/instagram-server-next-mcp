import { ErrorCode, McpError } from '../types/mcp.js';
/**
 * Custom error types for the Instagram MCP server
 */
export class InstagramError extends Error {
    constructor(message) {
        super(message);
        this.name = 'InstagramError';
    }
}
export class BrowserError extends Error {
    constructor(message) {
        super(message);
        this.name = 'BrowserError';
    }
}
export class FileSystemError extends Error {
    constructor(message) {
        super(message);
        this.name = 'FileSystemError';
    }
}
/**
 * Error handling utilities
 */
export class ErrorHandler {
    /**
     * Convert any error to an MCP error
     */
    static toMcpError(error) {
        if (error instanceof McpError) {
            return error;
        }
        const message = error instanceof Error ? error.message : String(error);
        let code = ErrorCode.InternalError;
        if (error instanceof InstagramError) {
            code = ErrorCode.InvalidRequest;
        }
        return new McpError(code, message);
    }
    /**
     * Create an MCP error for invalid parameters
     */
    static invalidParams(message) {
        return new McpError(ErrorCode.InvalidParams, message);
    }
    /**
     * Create an MCP error for method not found
     */
    static methodNotFound(method) {
        return new McpError(ErrorCode.MethodNotFound, `Unknown method: ${method}`);
    }
    /**
     * Create an MCP error for internal errors
     */
    static internal(message) {
        return new McpError(ErrorCode.InternalError, message);
    }
}
/**
 * Class decorator for handling async errors
 */
export function handleClassAsyncErrors(constructor) {
    return class extends constructor {
        constructor(...args) {
            super(...args);
            // Get all method names from the prototype
            const methodNames = Object.getOwnPropertyNames(constructor.prototype)
                .filter(name => {
                const descriptor = Object.getOwnPropertyDescriptor(constructor.prototype, name);
                return descriptor?.value instanceof Function && name !== 'constructor';
            });
            // Wrap each method with error handling
            for (const methodName of methodNames) {
                const originalMethod = this[methodName];
                if (originalMethod instanceof Function) {
                    this[methodName] = async (...args) => {
                        try {
                            return await originalMethod.apply(this, args);
                        }
                        catch (error) {
                            throw ErrorHandler.toMcpError(error);
                        }
                    };
                }
            }
        }
    };
}
/**
 * Method decorator for handling async errors
 */
export function handleAsyncErrors(target, propertyKey, descriptor) {
    const originalMethod = descriptor.value;
    descriptor.value = async function (...args) {
        try {
            return await originalMethod.apply(this, args);
        }
        catch (error) {
            throw ErrorHandler.toMcpError(error);
        }
    };
    return descriptor;
}
//# sourceMappingURL=errors.js.map