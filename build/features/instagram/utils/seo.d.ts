import { IInstagramPost } from '../../../core/types/instagram.js';
import { ISEOGenerator } from '../types.js';
export declare class SEOGenerator implements ISEOGenerator {
    private readonly serviceKeywords;
    generateDescription(post: Partial<IInstagramPost>): string;
    extractHashtags(text: string): string[];
    private extractServices;
}
