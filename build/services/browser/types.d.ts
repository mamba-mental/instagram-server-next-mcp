import { Page } from 'puppeteer';
export interface IBrowserConfig {
    headless: boolean;
    userDataDir: string;
    windowWidth: number;
    windowHeight: number;
    defaultTimeout: number;
}
export interface INavigationOptions {
    waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2';
    timeout?: number;
}
export interface IBrowserService {
    initialize(): Promise<void>;
    getPage(): Promise<Page>;
    close(): Promise<void>;
    navigateTo(page: Page, url: string, options?: INavigationOptions): Promise<void>;
    waitForSelector(page: Page, selector: string, timeout?: number): Promise<boolean>;
}
