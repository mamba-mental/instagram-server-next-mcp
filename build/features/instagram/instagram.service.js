var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { ConfigManager } from '../../core/utils/config.js';
import { InstagramError, handleClassAsyncErrors } from '../../core/utils/errors.js';
import { PostProcessor, PostSaver } from './utils/post.js';
import { chromium } from 'playwright';
import debug from 'debug';
const log = debug('instagram');
const BATCH_SIZE = 3;
const SCROLL_ATTEMPTS = 3;
const PROGRESS_INTERVAL = 60000; // Increased to 60 seconds
const MAX_CAPTION_LENGTH = 150; // Limit caption length
let InstagramService = class InstagramService {
    constructor() {
        this.config = ConfigManager.getInstance().getConfig();
        this.context = null;
        this.currentProgress = 0;
        this.totalProgress = 0;
        this.heartbeatInterval = null;
        this.lastProgressUpdate = 0;
        this.postProcessor = new PostProcessor();
        this.postSaver = new PostSaver(this.config.instagram.postsLogFile);
    }
    startHeartbeat(onProgress) {
        if (this.heartbeatInterval)
            clearInterval(this.heartbeatInterval);
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
    stopHeartbeat() {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }
    sendProgress(message, onProgress, keepAlive = false) {
        const now = Date.now();
        if (now - this.lastProgressUpdate >= PROGRESS_INTERVAL || !keepAlive) {
            this.currentProgress++;
            onProgress?.({
                type: 'progress',
                message: message.substring(0, 50), // Limit message length
                progress: this.currentProgress,
                total: this.totalProgress,
                keepAlive
            });
            this.lastProgressUpdate = now;
        }
    }
    async initContext() {
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
    async fetchPosts(username, limit, startFrom = 0, onProgress) {
        if (!onProgress)
            throw new Error('Progress callback required');
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
                const postLinks = await this.getPostLinks(page, startFrom + BATCH_SIZE);
                if (!postLinks.length)
                    throw new InstagramError('No posts found');
                const fetchedPosts = await this.postSaver.loadFetchedPosts();
                const endIndex = limit === 'all' ?
                    Math.min(startFrom + BATCH_SIZE, postLinks.length) :
                    Math.min(startFrom + (limit || BATCH_SIZE), postLinks.length);
                const targetLinks = postLinks.slice(startFrom, endIndex);
                this.totalProgress = this.currentProgress + targetLinks.length;
                const posts = [];
                for (const postUrl of targetLinks) {
                    try {
                        await page.goto(postUrl, {
                            waitUntil: 'domcontentloaded',
                            timeout: parseInt(process.env.TIMEOUT || '30000')
                        });
                        const postData = await this.extractPostData(page);
                        if (!postData)
                            continue;
                        const post = await this.postProcessor.processPost(postData, this.config.instagram.defaultSaveDir, username);
                        await this.postSaver.savePost(post, this.config.instagram.defaultSaveDir);
                        fetchedPosts.set(postUrl, new Date().toISOString());
                        await this.postSaver.saveFetchedPosts(fetchedPosts);
                        posts.push(post);
                        await this.delay(2000);
                    }
                    catch (error) {
                        log('Post error: %s', error instanceof Error ? error.message : String(error));
                        continue;
                    }
                }
                const hasMore = endIndex < postLinks.length;
                this.sendProgress(hasMore ? 'More available' : 'Complete', onProgress, hasMore);
                return posts;
            }
            finally {
                await page.close();
            }
        }
        catch (error) {
            log('Fatal error: %s', error instanceof Error ? error.message : String(error));
            throw error;
        }
        finally {
            this.stopHeartbeat();
        }
    }
    async getPostLinks(page, targetCount) {
        let previousHeight = 0;
        let attempts = 0;
        let links = [];
        while (attempts < SCROLL_ATTEMPTS) {
            previousHeight = await page.evaluate(() => document.body.scrollHeight);
            await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
            await this.delay(2000);
            links = await page.evaluate(() => {
                const links = new Set();
                document.querySelectorAll('a').forEach(anchor => {
                    const href = anchor.href;
                    if (href && (href.includes('/p/') || href.includes('/reel/'))) {
                        if (anchor.querySelector('img'))
                            links.add(href);
                    }
                });
                return Array.from(links);
            });
            if (links.length >= targetCount)
                break;
            const currentHeight = await page.evaluate(() => document.body.scrollHeight);
            if (currentHeight <= previousHeight) {
                attempts++;
                await this.delay(1000);
            }
        }
        return links;
    }
    async extractPostData(page) {
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
                if (!mediaUrl)
                    return null;
                const timeElement = document.querySelector('time');
                const timestamp = timeElement?.getAttribute('datetime') || new Date().toISOString();
                return {
                    type: video ? 'video' : 'image',
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
        }
        catch (error) {
            log('Extract error: %s', error instanceof Error ? error.message : String(error));
            return null;
        }
    }
    async delay(ms) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
    async close() {
        this.stopHeartbeat();
        if (this.context) {
            await this.context.close();
            this.context = null;
        }
    }
};
InstagramService = __decorate([
    handleClassAsyncErrors,
    __metadata("design:paramtypes", [])
], InstagramService);
export { InstagramService };
//# sourceMappingURL=instagram.service.js.map