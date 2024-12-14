import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';
import { FileSystemError } from '../../../core/utils/errors.js';
/**
 * Service for downloading and saving Instagram media files
 */
export class MediaDownloader {
    /**
     * Download media file from URL
     */
    async downloadMedia(url, savePath) {
        try {
            // Ensure directory exists
            await this.ensureDirectory(path.dirname(savePath));
            // Download file
            const response = await axios({
                url,
                method: 'GET',
                responseType: 'arraybuffer',
                timeout: 30000, // 30 second timeout
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36'
                }
            });
            // Save file
            await fs.writeFile(savePath, response.data);
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                throw new FileSystemError(`Failed to download media from ${url}: ${error.message}`);
            }
            throw new FileSystemError(`Failed to save media to ${savePath}: ${error instanceof Error ? error.message : String(error)}`);
        }
    }
    /**
     * Download video poster image
     */
    async downloadPoster(url, savePath) {
        await this.downloadMedia(url, savePath);
    }
    /**
     * Ensure directory exists
     */
    async ensureDirectory(dir) {
        try {
            await fs.access(dir);
        }
        catch {
            try {
                await fs.mkdir(dir, { recursive: true });
            }
            catch (error) {
                throw new FileSystemError(`Failed to create directory ${dir}: ${error instanceof Error ? error.message : String(error)}`);
            }
        }
    }
    /**
     * Get file extension from URL or fallback
     */
    static getFileExtension(url, fallback) {
        const extension = path.extname(url).toLowerCase();
        if (extension && ['.jpg', '.jpeg', '.png', '.mp4'].includes(extension)) {
            return extension;
        }
        return fallback;
    }
    /**
     * Sanitize filename
     */
    static sanitizeFilename(name) {
        return name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
    }
    /**
     * Extract post ID from URL
     */
    static getPostIdFromUrl(url) {
        const match = url.match(/\/p\/([^\/]+)/);
        return match ? match[1] : '';
    }
}
//# sourceMappingURL=media.js.map