export interface IBrowserConfig {
    headless: boolean;
    windowWidth: number;
    windowHeight: number;
    defaultTimeout: number;
    navigationTimeout: number;
}
export interface IInstagramConfig {
    defaultSaveDir: string;
    postsLogFile: string;
    defaultDelay: number;
    maxPostsPerBatch: number;
    batchBreakDelay: number;
    minDelay: number;
}
export interface IServerConfig {
    name: string;
    version: string;
    chromeUserDataDir: string;
    browser: IBrowserConfig;
    instagram: IInstagramConfig;
    capabilities: {
        tools?: Record<string, unknown>;
        resources?: Record<string, unknown>;
    };
}
export interface ITransport {
    connect(): Promise<void>;
    close(): Promise<void>;
}
export interface IRequestHandler<T = unknown, R = unknown> {
    (request: T): Promise<R>;
}
export interface ICallToolRequest {
    params: {
        name: string;
        arguments?: Record<string, unknown>;
    };
}
export interface ICallToolResponse {
    content: Array<{
        type: string;
        text: string;
    }>;
}
export interface IListToolsResponse {
    tools: Array<{
        name: string;
        description: string;
        inputSchema: {
            type: string;
            properties: Record<string, unknown>;
            required?: string[];
        };
    }>;
}
export interface IServer {
    connect(transport: ITransport): Promise<void>;
    close(): Promise<void>;
    setRequestHandler<T, R>(schema: symbol | string, handler: IRequestHandler<T, R>, method?: string): void;
    onerror?: (error: Error) => void;
}
export declare const ErrorCode: {
    readonly InvalidRequest: "INVALID_REQUEST";
    readonly InvalidParams: "INVALID_PARAMS";
    readonly MethodNotFound: "METHOD_NOT_FOUND";
    readonly InternalError: "INTERNAL_ERROR";
};
export type ErrorCodeType = typeof ErrorCode[keyof typeof ErrorCode];
export declare class McpError extends Error {
    code: ErrorCodeType;
    constructor(code: ErrorCodeType, message: string);
}
export declare const ListToolsRequestSchema: unique symbol;
export declare const CallToolRequestSchema: unique symbol;
export declare const RPC_METHODS: {
    readonly LIST_TOOLS: "list_tools";
    readonly CALL_TOOL: "call_tool";
};
export type RpcMethodType = typeof RPC_METHODS[keyof typeof RPC_METHODS];
