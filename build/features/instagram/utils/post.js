import path from 'path';
import fs from 'fs/promises';
import { FileSystemError } from '../../../core/utils/errors.js';
import { MediaDownloader } from './media.js';
import { SEOGenerator } from './seo.js';
/**
 * Service for processing Instagram posts
 */
export class PostProcessor {
    constructor() {
        this.seoGenerator = new SEOGenerator();
        this.mediaDownloader = new MediaDownloader();
    }
    /**
     * Process post data and save media
     */
    async processPost(postData, saveDir, username) {
        // Create post directory
        const postId = MediaDownloader.getPostIdFromUrl(postData.postUrl);
        const timestamp = new Date(postData.timestamp);
        const dateStr = timestamp.toISOString().split('T')[0];
        const postDir = path.join(saveDir, username, dateStr, MediaDownloader.sanitizeFilename(postId));
        // Download media
        const mediaExt = postData.type === 'video' ? '.mp4' : '.jpg';
        const mediaPath = path.join(postDir, `media${mediaExt}`);
        await this.mediaDownloader.downloadMedia(postData.type === 'video' && postData.videoUrl ? postData.videoUrl : postData.mediaUrl, mediaPath);
        // Download poster for videos
        let posterPath;
        if (postData.type === 'video' && postData.posterUrl) {
            posterPath = path.join(postDir, 'poster.jpg');
            await this.mediaDownloader.downloadPoster(postData.posterUrl, posterPath);
        }
        // Extract hashtags
        const hashtags = this.seoGenerator.extractHashtags(postData.caption);
        // Create post object
        const post = {
            id: postId,
            type: postData.type,
            mediaUrl: postData.mediaUrl,
            localMediaPath: mediaPath,
            alt: postData.alt,
            caption: postData.caption,
            seoDescription: this.seoGenerator.generateDescription({
                type: postData.type,
                mediaUrl: postData.mediaUrl,
                alt: postData.alt,
                caption: postData.caption,
                hashtags,
            }),
            timestamp: postData.timestamp,
            postUrl: postData.postUrl,
            hashtags,
            ...(postData.type === 'video' && {
                videoUrl: postData.videoUrl,
                posterUrl: postData.posterUrl
            })
        };
        return post;
    }
}
/**
 * Service for saving and loading post data
 */
export class PostSaver {
    constructor(postsLogFile) {
        this.postsLogFile = postsLogFile;
    }
    /**
     * Save post metadata
     */
    async savePost(post, saveDir) {
        try {
            const postDir = path.dirname(post.localMediaPath);
            const metadataPath = path.join(postDir, 'metadata.json');
            await fs.writeFile(metadataPath, JSON.stringify({
                ...post,
                fetchDate: new Date().toISOString()
            }, null, 2));
        }
        catch (error) {
            throw new FileSystemError(`Failed to save post metadata: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Load previously fetched posts
     */
    async loadFetchedPosts() {
        try {
            const data = await fs.readFile(this.postsLogFile, 'utf-8');
            const log = JSON.parse(data);
            return new Map(Object.entries(log.posts || {}));
        }
        catch {
            return new Map();
        }
    }
    /**
     * Save fetched posts log
     */
    async saveFetchedPosts(posts) {
        try {
            const log = {
                lastFetch: new Date().toISOString(),
                posts: Object.fromEntries(posts)
            };
            await fs.writeFile(this.postsLogFile, JSON.stringify(log, null, 2));
        }
        catch (error) {
            throw new FileSystemError(`Failed to save fetched posts log: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
}
//# sourceMappingURL=post.js.map