import { IInstagramPost } from '../../../core/types/instagram.js';
import { ISEOGenerator } from '../types.js';
/**
 * Service for generating SEO-friendly content from Instagram posts
 */
export declare class SEOGenerator implements ISEOGenerator {
    private readonly serviceKeywords;
    /**
     * Generate SEO-friendly description from post data
     */
    generateDescription(post: Partial<IInstagramPost>): string;
    /**
     * Extract hashtags from text, excluding color codes and non-meaningful tags
     */
    extractHashtags(text: string): string[];
    /**
     * Extract service types from post data
     */
    private extractServices;
    /**
     * Check if post has before/after context
     */
    private hasBeforeAfterContext;
}
