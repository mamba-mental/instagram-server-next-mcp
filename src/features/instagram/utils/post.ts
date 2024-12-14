import path from 'path';
import fs from 'fs/promises';
import { IPostProcessor, IPostSaver } from '../types.js';
import { IInstagramPost, IPostData } from '../../../core/types/instagram.js';
import { FileSystemError } from '../../../core/utils/errors.js';
import { MediaDownloader } from './media.js';
import { SEOGenerator } from './seo.js';

/**
 * Service for processing Instagram posts
 */
export class PostProcessor implements IPostProcessor {
  private readonly seoGenerator: SEOGenerator;
  private readonly mediaDownloader: MediaDownloader;

  constructor() {
    this.seoGenerator = new SEOGenerator();
    this.mediaDownloader = new MediaDownloader();
  }

  /**
   * Process post data and save media
   */
  public async processPost(
    postData: IPostData,
    saveDir: string,
    username: string
  ): Promise<IInstagramPost> {
    // Create post directory
    const postId = MediaDownloader.getPostIdFromUrl(postData.postUrl);
    const timestamp = new Date(postData.timestamp);
    const dateStr = timestamp.toISOString().split('T')[0];
    const postDir = path.join(
      saveDir,
      username,
      dateStr,
      MediaDownloader.sanitizeFilename(postId)
    );

    // Download media
    const mediaExt = postData.type === 'video' ? '.mp4' : '.jpg';
    const mediaPath = path.join(postDir, `media${mediaExt}`);
    
    await this.mediaDownloader.downloadMedia(
      postData.type === 'video' && postData.videoUrl ? postData.videoUrl : postData.mediaUrl,
      mediaPath
    );

    // Download poster for videos
    let posterPath: string | undefined;
    if (postData.type === 'video' && postData.posterUrl) {
      posterPath = path.join(postDir, 'poster.jpg');
      await this.mediaDownloader.downloadPoster(postData.posterUrl, posterPath);
    }

    // Extract hashtags
    const hashtags = this.seoGenerator.extractHashtags(postData.caption);

    // Create post object
    const post: IInstagramPost = {
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
export class PostSaver implements IPostSaver {
  private readonly postsLogFile: string;

  constructor(postsLogFile: string) {
    this.postsLogFile = postsLogFile;
  }

  /**
   * Save post metadata
   */
  public async savePost(post: IInstagramPost, saveDir: string): Promise<void> {
    try {
      const postDir = path.dirname(post.localMediaPath);
      const metadataPath = path.join(postDir, 'metadata.json');

      await fs.writeFile(
        metadataPath,
        JSON.stringify({
          ...post,
          fetchDate: new Date().toISOString()
        }, null, 2)
      );
    } catch (error) {
      throw new FileSystemError(
        `Failed to save post metadata: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Load previously fetched posts
   */
  public async loadFetchedPosts(): Promise<Map<string, string>> {
    try {
      const data = await fs.readFile(this.postsLogFile, 'utf-8');
      const log = JSON.parse(data);
      return new Map(Object.entries(log.posts || {}));
    } catch {
      return new Map();
    }
  }

  /**
   * Save fetched posts log
   */
  public async saveFetchedPosts(posts: Map<string, string>): Promise<void> {
    try {
      const log = {
        lastFetch: new Date().toISOString(),
        posts: Object.fromEntries(posts)
      };

      await fs.writeFile(
        this.postsLogFile,
        JSON.stringify(log, null, 2)
      );
    } catch (error) {
      throw new FileSystemError(
        `Failed to save fetched posts log: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}
