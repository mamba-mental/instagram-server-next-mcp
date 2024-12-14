export class SEOGenerator {
    constructor() {
        this.serviceKeywords = [
            'brows',
            'powderbrows',
            'microblading',
            'lipblush',
            'eyeliner',
            'areola'
        ];
    }
    generateDescription(post) {
        const services = this.extractServices(post);
        const parts = [];
        if (services.size > 0) {
            parts.push(`Cosmetic tattoo ${Array.from(services).join(', ')}`);
        }
        if (post.caption) {
            const caption = post.caption.toLowerCase();
            if (caption.includes('vancouver'))
                parts.push('Vancouver WA');
            if (caption.includes('before') || caption.includes('after'))
                parts.push('results');
            if (caption.includes('heal'))
                parts.push('healing progress');
            if (caption.includes('touch up'))
                parts.push('touch-up');
        }
        let desc = parts.length > 0 ?
            parts.join(' - ') :
            'Professional cosmetic tattoo services';
        return `${desc}. Contact Pink Ink for appointments.`;
    }
    extractHashtags(text) {
        if (!text)
            return [];
        const hashtagRegex = /#[a-zA-Z][a-zA-Z0-9_]{2,29}(?![a-zA-Z0-9_])/g;
        const matches = text.match(hashtagRegex) || [];
        return [...new Set(matches)]
            .map(tag => tag.slice(1))
            .filter(tag => tag.length >= 3 &&
            !/^[0-9a-fA-F]+$/.test(tag));
    }
    extractServices(post) {
        const services = new Set();
        const text = [
            post.caption?.toLowerCase() || '',
            ...(post.hashtags?.map(tag => tag.toLowerCase()) || [])
        ].join(' ');
        this.serviceKeywords.forEach(keyword => {
            if (text.includes(keyword))
                services.add(keyword);
        });
        return services;
    }
}
//# sourceMappingURL=seo.js.map