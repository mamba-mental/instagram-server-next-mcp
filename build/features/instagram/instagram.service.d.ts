import { IInstagramService, ProgressCallback } from './types.js';
import { IInstagramPost } from '../../core/types/instagram.js';
export declare class InstagramService implements IInstagramService {
    private readonly postProcessor;
    private readonly postSaver;
    private readonly config;
    private context;
    private currentProgress;
    private totalProgress;
    private heartbeatInterval;
    private lastProgressUpdate;
    constructor();
    private startHeartbeat;
    private stopHeartbeat;
    private sendProgress;
    private initContext;
    fetchPosts(username: string, limit?: number | 'all', startFrom?: number, onProgress?: ProgressCallback): Promise<IInstagramPost[]>;
    private getPostLinks;
    private extractPostData;
    private delay;
    close(): Promise<void>;
}
