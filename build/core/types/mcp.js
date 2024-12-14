export const ErrorCode = {
    InvalidRequest: 'INVALID_REQUEST',
    InvalidParams: 'INVALID_PARAMS',
    MethodNotFound: 'METHOD_NOT_FOUND',
    InternalError: 'INTERNAL_ERROR',
};
export class McpError extends Error {
    constructor(code, message) {
        super(message);
        this.code = code;
        this.name = 'McpError';
    }
}
// Request schemas with method names
export const ListToolsRequestSchema = Symbol('list_tools');
export const CallToolRequestSchema = Symbol('call_tool');
// JSON-RPC method names
export const RPC_METHODS = {
    LIST_TOOLS: 'list_tools',
    CALL_TOOL: 'call_tool',
};
//# sourceMappingURL=mcp.js.map