/**
 * GuidelinesService class for managing design guidelines and patterns
 */
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
import { logger } from '../utils/logger.js';
import { DataError, NotFoundError, ValidationError, handleErrors } from '../utils/errors.js';
import { circuitBreakerManager } from '../utils/circuit-breaker.js';
/**
 * Service for accessing and managing design guidelines and patterns
 */
export class GuidelinesService {
    dataManager;
    circuitBreaker = circuitBreakerManager.getCircuitBreaker({
        name: 'GuidelinesService',
        failureThreshold: 5,
        recoveryTimeout: 30000, // 30 seconds
        requestTimeout: 5000, // 5 seconds
        monitoringPeriod: 60000, // 1 minute
        halfOpenMaxCalls: 3
    });
    constructor(dataManager) {
        this.dataManager = dataManager;
        logger.info('GuidelinesService initialized', { service: 'GuidelinesService' });
    }
    /**
     * Get all available guidelines
     */
    async getGuidelines(options) {
        return this.circuitBreaker.execute(async () => {
            const cachedData = this.dataManager.getCachedData();
            if (!cachedData) {
                throw new DataError('No guidelines data available', [
                    'Ensure data files are loaded',
                    'Check data directory configuration'
                ], { service: 'GuidelinesService', method: 'getGuidelines' });
            }
            let guidelines = cachedData.guidelines;
            // Apply filters if provided
            if (options) {
                guidelines = this.filterGuidelines(guidelines, options);
            }
            return guidelines;
        }, { service: 'GuidelinesService', method: 'getGuidelines', options });
    }
    /**
     * Get a specific guideline by ID
     */
    async getGuideline(id) {
        return this.circuitBreaker.execute(async () => {
            if (!id || typeof id !== 'string') {
                throw new ValidationError('Guideline ID must be a non-empty string', [], { service: 'GuidelinesService', method: 'getGuideline', id });
            }
            const cachedData = this.dataManager.getCachedData();
            if (!cachedData) {
                throw new DataError('No guidelines data available', [
                    'Ensure data files are loaded',
                    'Check data directory configuration'
                ], { service: 'GuidelinesService', method: 'getGuideline' });
            }
            const guideline = cachedData.guidelines.find(guide => guide.id.toLowerCase() === id.toLowerCase());
            if (!guideline) {
                const availableGuidelines = cachedData.guidelines.map(guide => guide.id);
                throw new NotFoundError('Guideline', id, [
                    `Available guidelines: ${availableGuidelines.join(', ')}`,
                    'Check guideline ID spelling'
                ], { service: 'GuidelinesService', method: 'getGuideline' });
            }
            return guideline;
        }, { service: 'GuidelinesService', method: 'getGuideline', id });
    }
    /**
     * Search guidelines by query string
     */
    async searchGuidelines(query) {
        return this.circuitBreaker.execute(async () => {
            if (!query || typeof query !== 'string') {
                throw new ValidationError('Search query must be a non-empty string', [], { service: 'GuidelinesService', method: 'searchGuidelines', query });
            }
            const cachedData = this.dataManager.getCachedData();
            if (!cachedData) {
                throw new DataError('No guidelines data available', [
                    'Ensure data files are loaded',
                    'Check data directory configuration'
                ], { service: 'GuidelinesService', method: 'searchGuidelines' });
            }
            const searchTerm = query.toLowerCase();
            return cachedData.guidelines.filter(guideline => {
                // Search in title
                if (guideline.title.toLowerCase().includes(searchTerm)) {
                    return true;
                }
                // Search in content
                if (guideline.content.toLowerCase().includes(searchTerm)) {
                    return true;
                }
                // Search in category
                if (guideline.category.toLowerCase().includes(searchTerm)) {
                    return true;
                }
                // Search in tags
                if (guideline.tags.some(tag => tag.toLowerCase().includes(searchTerm))) {
                    return true;
                }
                return false;
            });
        }, { service: 'GuidelinesService', method: 'searchGuidelines', query });
    }
    /**
     * Get guidelines by category
     */
    async getGuidelinesByCategory(category) {
        if (!category || typeof category !== 'string') {
            throw new ValidationError('Category must be a non-empty string', [], { service: 'GuidelinesService', method: 'getGuidelinesByCategory', category });
        }
        return this.getGuidelines({ category });
    }
    /**
     * Get all available guideline categories
     */
    async getGuidelineCategories() {
        const guidelines = await this.getGuidelines();
        const categories = new Set(guidelines.map(guide => guide.category));
        return Array.from(categories).sort();
    }
    /**
     * Get guidelines by tag
     */
    async getGuidelinesByTag(tag) {
        if (!tag || typeof tag !== 'string') {
            throw new ValidationError('Tag must be a non-empty string', [], { service: 'GuidelinesService', method: 'getGuidelinesByTag', tag });
        }
        return this.getGuidelines({ tags: [tag] });
    }
    /**
     * Get all available tags
     */
    async getAvailableTags() {
        const guidelines = await this.getGuidelines();
        const allTags = guidelines.flatMap(guide => guide.tags);
        const uniqueTags = new Set(allTags);
        return Array.from(uniqueTags).sort();
    }
    /**
     * Get guidelines related to a specific component
     */
    async getRelatedToComponent(componentName) {
        if (!componentName || typeof componentName !== 'string') {
            throw new ValidationError('Component name must be a non-empty string', [], { service: 'GuidelinesService', method: 'getRelatedToComponent', componentName });
        }
        return this.getGuidelines({ relatedComponent: componentName });
    }
    /**
     * Get guidelines related to a specific design token
     */
    async getRelatedToToken(tokenName) {
        if (!tokenName || typeof tokenName !== 'string') {
            throw new ValidationError('Token name must be a non-empty string', [], { service: 'GuidelinesService', method: 'getRelatedToToken', tokenName });
        }
        return this.getGuidelines({ relatedToken: tokenName });
    }
    /**
     * Get related components for a guideline
     */
    async getRelatedComponents(guidelineId) {
        const guideline = await this.getGuideline(guidelineId);
        return guideline.relatedComponents || [];
    }
    /**
     * Get related tokens for a guideline
     */
    async getRelatedTokens(guidelineId) {
        const guideline = await this.getGuideline(guidelineId);
        return guideline.relatedTokens || [];
    }
    /**
     * Filter guidelines based on search options
     */
    filterGuidelines(guidelines, options) {
        return guidelines.filter(guideline => {
            // Filter by category
            if (options.category &&
                guideline.category.toLowerCase() !== options.category.toLowerCase()) {
                return false;
            }
            // Filter by tags
            if (options.tags && options.tags.length > 0) {
                const guidelineTags = guideline.tags.map(tag => tag.toLowerCase());
                const hasAllTags = options.tags.every(tag => guidelineTags.includes(tag.toLowerCase()));
                if (!hasAllTags) {
                    return false;
                }
            }
            // Filter by related component
            if (options.relatedComponent) {
                const relatedComponents = guideline.relatedComponents || [];
                const hasRelatedComponent = relatedComponents.some(comp => comp.toLowerCase() === options.relatedComponent.toLowerCase());
                if (!hasRelatedComponent) {
                    return false;
                }
            }
            // Filter by related token
            if (options.relatedToken) {
                const relatedTokens = guideline.relatedTokens || [];
                const hasRelatedToken = relatedTokens.some(token => token.toLowerCase() === options.relatedToken.toLowerCase());
                if (!hasRelatedToken) {
                    return false;
                }
            }
            return true;
        });
    }
}
__decorate([
    handleErrors,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], GuidelinesService.prototype, "getGuidelines", null);
__decorate([
    handleErrors,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GuidelinesService.prototype, "getGuideline", null);
__decorate([
    handleErrors,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GuidelinesService.prototype, "searchGuidelines", null);
__decorate([
    handleErrors,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GuidelinesService.prototype, "getGuidelinesByCategory", null);
__decorate([
    handleErrors,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GuidelinesService.prototype, "getGuidelineCategories", null);
__decorate([
    handleErrors,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GuidelinesService.prototype, "getGuidelinesByTag", null);
__decorate([
    handleErrors,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], GuidelinesService.prototype, "getAvailableTags", null);
__decorate([
    handleErrors,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GuidelinesService.prototype, "getRelatedToComponent", null);
__decorate([
    handleErrors,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GuidelinesService.prototype, "getRelatedToToken", null);
__decorate([
    handleErrors,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GuidelinesService.prototype, "getRelatedComponents", null);
__decorate([
    handleErrors,
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], GuidelinesService.prototype, "getRelatedTokens", null);
//# sourceMappingURL=guidelines-service.js.map