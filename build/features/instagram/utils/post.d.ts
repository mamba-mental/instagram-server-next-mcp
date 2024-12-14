import { IPostProcessor, IPostSaver } from '../types.js';
import { IInstagramPost, IPostData } from '../../../core/types/instagram.js';
export declare class PostProcessor implements IPostProcessor {
    private readonly seoGenerator;
    private readonly mediaDownloader;
    constructor();
    processPost(postData: IPostData, saveDir: string, username: string): Promise<IInstagramPost>;
}
export declare class PostSaver implements IPostSaver {
    private readonly postsLogFile;
    private postsCache;
    constructor(postsLogFile: string);
    savePost(post: IInstagramPost, saveDir: string): Promise<void>;
    loadFetchedPosts(): Promise<Map<string, string>>;
    saveFetchedPosts(posts: Map<string, string>): Promise<void>;
}
