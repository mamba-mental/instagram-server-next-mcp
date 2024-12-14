import { IMediaDownloader } from '../types.js';
/**
 * Service for downloading and saving Instagram media files
 */
export declare class MediaDownloader implements IMediaDownloader {
    /**
     * Download media file from URL
     */
    downloadMedia(url: string, savePath: string): Promise<void>;
    /**
     * Download video poster image
     */
    downloadPoster(url: string, savePath: string): Promise<void>;
    /**
     * Ensure directory exists
     */
    private ensureDirectory;
    /**
     * Get file extension from URL or fallback
     */
    static getFileExtension(url: string, fallback: string): string;
    /**
     * Sanitize filename
     */
    static sanitizeFilename(name: string): string;
    /**
     * Extract post ID from URL
     */
    static getPostIdFromUrl(url: string): string;
}
