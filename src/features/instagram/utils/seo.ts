import { IInstagramPost } from '../../../core/types/instagram.js';
import { ISEOGenerator } from '../types.js';

/**
 * Service for generating SEO-friendly content from Instagram posts
 */
export class SEOGenerator implements ISEOGenerator {
  private readonly serviceKeywords = [
    'brows',
    'powderbrows',
    'microblading',
    'lipblush',
    'eyeliner',
    'areola'
  ];

  /**
   * Generate SEO-friendly description from post data
   */
  public generateDescription(post: Partial<IInstagramPost>): string {
    const parts: string[] = [];

    // Extract service types
    const services = this.extractServices(post);
    if (services.size > 0) {
      parts.push(`Cosmetic tattoo ${Array.from(services).join(' and ')} service`);
    }

    // Add location context
    if (post.caption?.includes('Vancouver')) {
      parts.push('in Vancouver, Washington');
    }

    // Add before/after context
    if (this.hasBeforeAfterContext(post.caption)) {
      parts.push('showing before and after results');
    }

    // Add healing context
    if (post.caption?.toLowerCase().includes('heal')) {
      parts.push('demonstrating healing progress');
    }

    // Add touch-up context
    if (post.caption?.toLowerCase().includes('touch up')) {
      parts.push('showing touch-up results');
    }

    // Combine parts
    let description = parts.join(' ');

    // Add general context if description is too short
    if (description.length < 50) {
      description = `Professional cosmetic tattoo work ${description}`;
    }

    // Add call to action
    description += '. Contact Pink Ink Cosmetic Tattoo for professional permanent makeup services.';

    return description;
  }

  /**
   * Extract hashtags from text, excluding color codes and non-meaningful tags
   */
  public extractHashtags(text: string): string[] {
    if (!text) return [];

    // Match hashtags that:
    // 1. Start with #
    // 2. Followed by a letter (a-zA-Z)
    // 3. Can contain letters, numbers, or underscores
    // 4. Are between 3 and 30 characters long (excluding #)
    // 5. Are not followed by another word character
    // 6. Are not hex color codes
    const hashtagRegex = /#(?![0-9a-fA-F]{3,8}(?![a-zA-Z0-9_]))[a-zA-Z][a-zA-Z0-9_]{2,29}(?![a-zA-Z0-9_])/g;
    const matches = text.match(hashtagRegex) || [];
    
    // Remove duplicates and the # symbol
    const uniqueTags = [...new Set(matches)].map(tag => tag.slice(1));

    // Filter out common non-meaningful tags and ensure minimum length
    return uniqueTags.filter(tag => {
      // Exclude tags that are too short
      if (tag.length < 3) return false;

      // Exclude tags that look like color codes (e.g., fff, FFFFFF)
      if (/^[0-9a-fA-F]+$/.test(tag)) return false;

      return true;
    });
  }

  /**
   * Extract service types from post data
   */
  private extractServices(post: Partial<IInstagramPost>): Set<string> {
    const services = new Set<string>();

    // Check hashtags
    post.hashtags?.forEach(tag => {
      this.serviceKeywords.forEach(keyword => {
        if (tag.toLowerCase().includes(keyword)) {
          services.add(keyword);
        }
      });
    });

    // Check caption
    if (post.caption) {
      this.serviceKeywords.forEach(keyword => {
        if (post.caption?.toLowerCase().includes(keyword)) {
          services.add(keyword);
        }
      });
    }

    return services;
  }

  /**
   * Check if post has before/after context
   */
  private hasBeforeAfterContext(caption?: string): boolean {
    if (!caption) return false;
    const lowerCaption = caption.toLowerCase();
    return lowerCaption.includes('before') || lowerCaption.includes('after');
  }
}
