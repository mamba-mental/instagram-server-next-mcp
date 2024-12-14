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
const logInit = debug('instagram:init');
const logNav = debug('instagram:navigation');
const logPost = debug('instagram:post');
const logError = debug('instagram:error');
const BATCH_SIZE = 3;
const SCROLL_ATTEMPTS = 3;
const PROGRESS_INTERVAL = 45000; // 45 seconds between updates
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
        logInit('Instagram service initialized');
    }
    startHeartbeat(onProgress) {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
        }
        this.heartbeatInterval = setInterval(() => {
            const now = Date.now();
            if (now - this.lastProgressUpdate >= PROGRESS_INTERVAL) {
                const update = {
                    type: 'progress',
                    message: 'Processing...',
                    progress: this.currentProgress,
                    total: this.totalProgress,
                    keepAlive: true
                };
                onProgress(update);
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
            const update = {
                type: 'progress',
                message,
                progress: this.currentProgress,
                total: this.totalProgress,
                keepAlive
            };
            logPost(`Progress ${this.currentProgress}/${this.totalProgress}: ${message}`);
            onProgress?.(update);
            this.lastProgressUpdate = now;
        }
    }
    async initContext() {
        if (!this.context) {
            logInit('Initializing browser context...');
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
                logNav(`${request.method()} ${request.url()}`);
                const headers = {
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
                };
                await route.continue({ headers });
            });
            this.context.on('console', msg => {
                const type = msg.type();
                const text = msg.text();
                if (type === 'error') {
                    logError(`Browser console error: ${text}`);
                }
                else {
                    logNav(`Browser console ${type}: ${text}`);
                }
            });
            logInit('Browser context initialized');
        }
        return this.context;
    }
    async fetchPosts(username, limit, startFrom = 0, onProgress) {
        if (!onProgress) {
            throw new Error('Progress callback is required for long-running operations');
        }
        this.startHeartbeat(onProgress);
        try {
            this.currentProgress = 0;
            this.totalProgress = 10;
            const context = await this.initContext();
            const page = await context.newPage();
            try {
                this.sendProgress('Initializing browser...', onProgress, true);
                await this.delay(1000);
                this.sendProgress(`Navigating to profile: ${username}`, onProgress, true);
                await page.goto(`https://www.instagram.com/${username}/`, {
                    waitUntil: 'domcontentloaded',
                    timeout: parseInt(process.env.TIMEOUT || '30000')
                });
                this.sendProgress('Loading initial posts...', onProgress, true);
                const postLinks = await this.getPostLinks(page, startFrom + BATCH_SIZE);
                if (!postLinks.length) {
                    throw new InstagramError('No posts found');
                }
                const fetchedPosts = await this.postSaver.loadFetchedPosts();
                const endIndex = limit === 'all' ?
                    Math.min(startFrom + BATCH_SIZE, postLinks.length) :
                    Math.min(startFrom + (limit || BATCH_SIZE), postLinks.length);
                const targetLinks = postLinks.slice(startFrom, endIndex);
                this.totalProgress = this.currentProgress + (targetLinks.length * 3);
                const posts = [];
                for (let i = 0; i < targetLinks.length; i++) {
                    const postUrl = targetLinks[i];
                    if (!postUrl)
                        continue;
                    try {
                        this.sendProgress(`Processing post ${startFrom + i + 1} of ${endIndex}`, onProgress, true);
                        await page.goto(postUrl, {
                            waitUntil: 'domcontentloaded',
                            timeout: parseInt(process.env.TIMEOUT || '30000')
                        });
                        const postData = await this.extractPostData(page);
                        if (!postData) {
                            logPost('No data found for post, skipping...');
                            continue;
                        }
                        const post = await this.postProcessor.processPost(postData, this.config.instagram.defaultSaveDir, username);
                        await this.postSaver.savePost(post, this.config.instagram.defaultSaveDir);
                        fetchedPosts.set(postUrl, new Date().toISOString());
                        await this.postSaver.saveFetchedPosts(fetchedPosts);
                        posts.push(post);
                        if (i < targetLinks.length - 1) {
                            await this.delay(3000);
                        }
                    }
                    catch (error) {
                        const errorMessage = error instanceof Error ? error.message : String(error);
                        logError(`Error processing post ${startFrom + i + 1}: ${errorMessage}`);
                        continue;
                    }
                }
                const hasMore = endIndex < postLinks.length;
                this.sendProgress(hasMore ? `Processed ${posts.length} posts, more available` : 'Finished processing posts', onProgress, hasMore);
                return posts;
            }
            finally {
                await page.close();
            }
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            logError(`Fatal error: ${errorMessage}`);
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
            await this.delay(3000);
            links = await page.evaluate(() => {
                const links = new Set();
                document.querySelectorAll('a').forEach(anchor => {
                    const href = anchor.href;
                    if (href && (href.includes('/p/') || href.includes('/reel/'))) {
                        if (anchor.querySelector('img')) {
                            links.add(href);
                        }
                    }
                });
                return Array.from(links);
            });
            if (links.length >= targetCount) {
                break;
            }
            const currentHeight = await page.evaluate(() => document.body.scrollHeight);
            if (currentHeight <= previousHeight) {
                attempts++;
                await this.delay(2000);
            }
        }
        return links;
    }
    async extractPostData(page) {
        try {
            return await page.evaluate(() => {
                const img = document.querySelector('img:not([src*="150x150"]):not([src*="profile"])');
                const video = document.querySelector('video');
                const textElements = Array.from(document.querySelectorAll('*'));
                let caption = '';
                for (const element of textElements) {
                    const text = element.textContent?.trim() || '';
                    if (text.includes('#') || text.length > 30) {
                        caption = text;
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
                    alt: img?.getAttribute('alt') || video?.getAttribute('alt') || '',
                    caption,
                    timestamp,
                    postUrl: window.location.href,
                    ...(video && {
                        videoUrl: video.getAttribute('src') || '',
                        posterUrl: video.getAttribute('poster') || '',
                    }),
                };
            });
        }
        catch (error) {
            logError(`Error extracting post data: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }
    async delay(ms) {
        await new Promise(resolve => setTimeout(resolve, ms));
    }
    async close() {
        this.stopHeartbeat();
        if (this.context) {
            logInit('Closing browser context...');
            await this.context.close();
            this.context = null;
            logInit('Browser context closed');
        }
    }
};
InstagramService = __decorate([
    handleClassAsyncErrors,
    __metadata("design:paramtypes", [])
], InstagramService);
export { InstagramService };
//# sourceMappingURL=instagram.service.js.map