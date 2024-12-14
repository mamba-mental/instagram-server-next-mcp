import { IInstagramService, IProgressUpdate, ProgressCallback, IPostData } from './types.js';
import { IInstagramPost } from '../../core/types/instagram.js';
import { ConfigManager } from '../../core/utils/config.js';
import { InstagramError, handleClassAsyncErrors } from '../../core/utils/errors.js';
import { PostProcessor, PostSaver } from './utils/post.js';
import { chromium, Browser, Page, BrowserContext } from 'playwright';
import debug from 'debug';

const log = debug('instagram');

const BATCH_SIZE = 3;
const SCROLL_ATTEMPTS = 3;
const PROGRESS_INTERVAL = 60000;
const MAX_CAPTION_LENGTH = 150;

@handleClassAsyncErrors
export class InstagramService implements IInstagramService {
  private readonly postProcessor: PostProcessor;
  private readonly postSaver: PostSaver;
  private readonly config = ConfigManager.getInstance().getConfig();
  private context: BrowserContext | null = null;
  private currentProgress = 0;
  private totalProgress = 0;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private lastProgressUpdate = 0;
  private cachedPostLinks: string[] = [];
  private lastFetchTimestamp = 0;
  private CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.postProcessor = new PostProcessor();
    this.postSaver = new PostSaver(this.config.instagram.postsLogFile);
  }

  private async getCachedOrFetchLinks(page: Page, targetCount: number): Promise<string[]> {
    const now = Date.now();
    if (this.cachedPostLinks.length >= targetCount && 
        now - this.lastFetchTimestamp < this.CACHE_TTL) {
      return this.cachedPostLinks;
    }

    const links = await this.getPostLinks(page, targetCount);
    this.cachedPostLinks = links;
    this.lastFetchTimestamp = now;
    return links;
  }

  private startHeartbeat(onProgress: ProgressCallback): void {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      if (now - this.lastProgressUpdate >= PROGRESS_INTERVAL) {
        onProgress({
          type: 'progress',
          message: 'Processing...',
          progress: this.currentProgress,
          total: this.totalProgress,
          keepAlive: true
        });
        this.lastProgressUpdate = now;
      }
    }, PROGRESS_INTERVAL);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  private sendProgress(message: string, onProgress?: ProgressCallback, keepAlive = false) {
    const now = Date.now();
    if (now - this.lastProgressUpdate >= PROGRESS_INTERVAL || !keepAlive) {
      this.currentProgress++;
      onProgress?.({
        type: 'progress',
        message: message.substring(0, 50),
        progress: this.currentProgress,
        total: this.totalProgress,
        keepAlive
      });
      this.lastProgressUpdate = now;
    }
  }

  private async initContext(): Promise<BrowserContext> {
    if (!this.context) {
      const browser = await chromium.connectOverCDP('http://localhost:9222');
      const contexts = browser.contexts();
      
      this.context = contexts[0] || await browser.newContext({
        viewport: { width: 390, height: 844 },
        userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1 Mobile/15E148 Safari/604.1',
        deviceScaleFactor: 3,
        isMobile: true,
        hasTouch: true
      });

      await this.context.route('**/*', async (route, request) => {
        await route.continue({
          headers: {
            ...request.headers(),
            'Accept': '*/*',
            'Accept-Language': 'en-US,en;q=0.9',
            'Sec-Fetch-Site': 'same-origin',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Dest': 'empty',
            'X-IG-App-ID': '936619743392459',
            'X-Requested-With': 'XMLHttpRequest',
            'X-ASBD-ID': '129477',
            'X-IG-WWW-Claim': '0'
          }
        });
      });
    }
    return this.context;
  }

  public async fetchPosts(
    username: string,
    limit?: number | 'all',
    startFrom: number = 0,
    onProgress?: ProgressCallback
  ): Promise<IInstagramPost[]> {
    if (!onProgress) throw new Error('Progress callback required');
    this.startHeartbeat(onProgress);

    try {
      this.currentProgress = 0;
      this.totalProgress = 5;

      const context = await this.initContext();
      const page = await context.newPage();

      try {
        this.sendProgress('Loading...', onProgress, true);
        
        await page.goto(`https://www.instagram.com/${username}/`, {
          waitUntil: 'domcontentloaded',
          timeout: parseInt(process.env.TIMEOUT || '30000')
        });

        const postLinks = await this.getCachedOrFetchLinks(page, startFrom + BATCH_SIZE);
        if (!postLinks.length) throw new InstagramError('No posts found');

        const fetchedPosts = await this.postSaver.loadFetchedPosts();
        const endIndex = limit === 'all' ? 
          Math.min(startFrom + BATCH_SIZE, postLinks.length) : 
          Math.min(startFrom + (limit || BATCH_SIZE), postLinks.length);
        
        const targetLinks = postLinks.slice(startFrom, endIndex);
        this.totalProgress = this.currentProgress + targetLinks.length;
        
        const posts: IInstagramPost[] = [];
        for (const postUrl of targetLinks) {
          try {
            await page.goto(postUrl, {
              waitUntil: 'domcontentloaded',
              timeout: parseInt(process.env.TIMEOUT || '30000')
            });

            const postData = await this.extractPostData(page);
            if (!postData) continue;

            const post = await this.postProcessor.processPost(
              postData,
              this.config.instagram.defaultSaveDir,
              username
            );

            await this.postSaver.savePost(post, this.config.instagram.defaultSaveDir);
            fetchedPosts.set(postUrl, new Date().toISOString());
            await this.postSaver.saveFetchedPosts(fetchedPosts);

            posts.push(post);
            await this.delay(2000);
          } catch (error) {
            log('Post error: %s', error instanceof Error ? error.message : String(error));
            continue;
          }
        }

        const hasMore = endIndex < postLinks.length;
        this.sendProgress(
          hasMore ? 'More available' : 'Complete',
          onProgress,
          hasMore
        );
        
        return posts;
      } finally {
        await page.close();
      }
    } catch (error) {
      log('Fatal error: %s', error instanceof Error ? error.message : String(error));
      throw error;
    } finally {
      this.stopHeartbeat();
    }
  }

  private async getPostLinks(page: Page, targetCount: number): Promise<string[]> {
    let previousHeight = 0;
    let attempts = 0;
    let links: string[] = [];

    while (attempts < SCROLL_ATTEMPTS) {
      previousHeight = await page.evaluate(() => document.body.scrollHeight);
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await this.delay(2000);

      links = await page.evaluate(() => {
        const links = new Set<string>();
        document.querySelectorAll('a').forEach(anchor => {
          const href = anchor.href;
          if (href && (href.includes('/p/') || href.includes('/reel/'))) {
            if (anchor.querySelector('img')) links.add(href);
          }
        });
        return Array.from(links);
      });

      if (links.length >= targetCount) break;

      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      if (currentHeight <= previousHeight) {
        attempts++;
        await this.delay(1000);
      }
    }

    return links;
  }

  private async extractPostData(page: Page): Promise<IPostData | null> {
    try {
      return await page.evaluate((maxLength) => {
        const img = document.querySelector('img:not([src*="150x150"]):not([src*="profile"])');
        const video = document.querySelector('video');
        const textElements = Array.from(document.querySelectorAll('*'));
        let caption = '';

        for (const element of textElements) {
          const text = element.textContent?.trim() || '';
          if (text.includes('#') || text.length > 30) {
            caption = text.substring(0, maxLength);
            break;
          }
        }

        const mediaUrl = video ? 
          video.getAttribute('src') || video.getAttribute('poster') : 
          img?.getAttribute('src');

        if (!mediaUrl) return null;

        const timeElement = document.querySelector('time');
        const timestamp = timeElement?.getAttribute('datetime') || new Date().toISOString();

        return {
          type: video ? 'video' as const : 'image' as const,
          mediaUrl,
          alt: (img?.getAttribute('alt') || video?.getAttribute('alt') || '').substring(0, 100),
          caption,
          timestamp,
          postUrl: window.location.href,
          ...(video && {
            videoUrl: video.getAttribute('src') || '',
            posterUrl: video.getAttribute('poster') || '',
          }),
        };
      }, MAX_CAPTION_LENGTH);
    } catch (error) {
      log('Extract error: %s', error instanceof Error ? error.message : String(error));
      return null;
    }
  }

  private async delay(ms: number): Promise<void> {
    await new Promise(resolve => setTimeout(resolve, ms));
  }

  public async close(): Promise<void> {
    this.stopHeartbeat();
    if (this.context) {
      await this.context.close();
      this.context = null;
    }
  }
}
