import * as puppeteer from 'puppeteer';
import { IBrowserService, INavigationOptions } from './types.js';
/**
 * Service for managing browser interactions
 */
export declare class BrowserService implements IBrowserService {
    private browser;
    private config;
    constructor();
    /**
     * Initialize the browser instance
     */
    initialize(): Promise<void>;
    /**
     * Get a new page instance
     */
    getPage(): Promise<puppeteer.Page>;
    /**
     * Close the browser instance
     */
    close(): Promise<void>;
    /**
     * Configure a page instance with default settings
     */
    private setupPage;
    /**
     * Navigate to a URL with error handling
     */
    navigateTo(page: puppeteer.Page, url: string, options?: INavigationOptions): Promise<void>;
    /**
     * Wait for a selector with error handling
     */
    waitForSelector(page: puppeteer.Page, selector: string, timeout?: number): Promise<boolean>;
}
