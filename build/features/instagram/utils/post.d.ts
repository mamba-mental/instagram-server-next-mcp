import { IPostProcessor, IPostSaver } from '../types.js';
import { IInstagramPost, IPostData } from '../../../core/types/instagram.js';
/**
 * Service for processing Instagram posts
 */
export declare class PostProcessor implements IPostProcessor {
    private readonly seoGenerator;
    private readonly mediaDownloader;
    constructor();
    /**
     * Process post data and save media
     */
    processPost(postData: IPostData, saveDir: string, username: string): Promise<IInstagramPost>;
}
/**
 * Service for saving and loading post data
 */
export declare class PostSaver implements IPostSaver {
    private readonly postsLogFile;
    constructor(postsLogFile: string);
    /**
     * Save post metadata
     */
    savePost(post: IInstagramPost, saveDir: string): Promise<void>;
    /**
     * Load previously fetched posts
     */
    loadFetchedPosts(): Promise<Map<string, string>>;
    /**
     * Save fetched posts log
     */
    saveFetchedPosts(posts: Map<string, string>): Promise<void>;
}
