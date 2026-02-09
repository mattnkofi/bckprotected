// services/BadgeService.js
const FileStorageService = require('./FileStorageService');

/**
 * Badge Service - Specialized handler for badge icon management
 * 
 * Features:
 * - Upload badge icons to Cloudflare R2
 * - Optimize badge images (preserve transparency)
 * - Manage badge icon lifecycle
 * - Support multiple rarity visual styles
 */
class BadgeService {
    /**
     * Upload badge icon to R2
     * @param {Buffer} fileBuffer - Image buffer
     * @param {number} badgeId - Badge ID for storage organization
     * @param {string} mimetype - File mimetype
     * @param {string} originalFilename - Original filename
     * @returns {Promise<Object>} - Upload result with key and URL
     */
    async uploadBadgeIcon(fileBuffer, badgeId, mimetype, originalFilename) {
        try {
            // Validate it's an image
            if (!this._isImageType(mimetype)) {
                throw new Error('Badge icon must be an image file (PNG, JPEG, GIF, WebP)');
            }

            // Use FileStorageService's badge upload method
            const result = await FileStorageService.uploadBadge(
                fileBuffer,
                badgeId,
                mimetype,
                originalFilename
            );

            return result;
        } catch (error) {
            console.error('Badge icon upload error:', error);
            throw new Error(`Failed to upload badge icon: ${error.message}`);
        }
    }

    /**
     * Update badge icon (deletes old, uploads new)
     * @param {Buffer} fileBuffer - New image buffer
     * @param {number} badgeId - Badge ID
     * @param {string} oldIconKey - Previous icon key to delete
     * @param {string} mimetype - File mimetype
     * @param {string} originalFilename - Original filename
     * @returns {Promise<Object>} - Upload result
     */
    async updateBadgeIcon(fileBuffer, badgeId, oldIconKey, mimetype, originalFilename) {
        try {
            // Delete old icon if exists
            if (oldIconKey) {
                await FileStorageService.deleteFile(oldIconKey).catch(err => {
                    console.warn(`Failed to delete old badge icon: ${oldIconKey}`, err);
                    // Don't fail update if delete fails
                });
            }

            // Upload new icon
            return await this.uploadBadgeIcon(fileBuffer, badgeId, mimetype, originalFilename);
        } catch (error) {
            console.error('Badge icon update error:', error);
            throw error;
        }
    }

    /**
     * Delete badge icon from R2
     * @param {string} iconKey - R2 storage key
     * @returns {Promise<void>}
     */
    async deleteBadgeIcon(iconKey) {
        try {
            if (!iconKey) {
                throw new Error('Icon key is required for deletion');
            }

            await FileStorageService.deleteFile(iconKey);
        } catch (error) {
            console.error('Badge icon deletion error:', error);
            throw new Error(`Failed to delete badge icon: ${error.message}`);
        }
    }

    /**
     * Validate badge icon file
     * @param {Object} file - File object with buffer, mimetype, size
     * @returns {Object} - Validation result
     */
    validateBadgeIcon(file) {
        const errors = [];

        if (!file || !file.buffer) {
            errors.push('No file provided');
            return { valid: false, errors };
        }

        // Check file type
        if (!this._isImageType(file.mimetype)) {
            errors.push('Badge icon must be an image (PNG, JPEG, GIF, or WebP)');
        }

        // Check file size (5MB max for badges)
        const maxSize = 5 * 1024 * 1024; // 5MB
        if (file.size > maxSize) {
            errors.push(`File size exceeds 5MB limit (current: ${this._formatBytes(file.size)})`);
        }

        // Recommend PNG for transparency
        if (file.mimetype !== 'image/png') {
            // This is a warning, not an error
            console.warn('PNG recommended for badge icons to support transparency');
        }

        return {
            valid: errors.length === 0,
            errors
        };
    }

    /**
     * Get badge icon URL from key
     * @param {string} iconKey - R2 storage key
     * @returns {string} - Public URL
     */
    getBadgeIconUrl(iconKey) {
        if (!iconKey) return null;
        return FileStorageService.getFileUrl(iconKey);
    }

    /**
     * Construct URL with transformations (if using Cloudflare Workers)
     * @param {string} iconKey - R2 storage key
     * @param {Object} options - Transformation options
     * @returns {string} - Transformed URL
     */
    getBadgeIconUrlWithTransform(iconKey, options = {}) {
        if (!iconKey) return null;

        const baseUrl = this.getBadgeIconUrl(iconKey);

        // If using Cloudflare Image Resizing through Workers
        const {
            width = null,
            height = null,
            quality = null,
            format = null
        } = options;

        // Example: Add query parameters for image transformation
        const params = new URLSearchParams();
        if (width) params.append('width', width);
        if (height) params.append('height', height);
        if (quality) params.append('quality', quality);
        if (format) params.append('format', format);

        const queryString = params.toString();
        return queryString ? `${baseUrl}?${queryString}` : baseUrl;
    }

    /**
     * Get badge icon variants for different display contexts
     * @param {string} iconKey - R2 storage key
     * @returns {Object} - Icon URLs in different sizes
     */
    getBadgeIconVariants(iconKey) {
        if (!iconKey) {
            return {
                original: null,
                large: null,
                medium: null,
                small: null,
                thumbnail: null
            };
        }

        return {
            original: this.getBadgeIconUrl(iconKey),
            large: this.getBadgeIconUrlWithTransform(iconKey, { width: 400, height: 400 }),
            medium: this.getBadgeIconUrlWithTransform(iconKey, { width: 200, height: 200 }),
            small: this.getBadgeIconUrlWithTransform(iconKey, { width: 100, height: 100 }),
            thumbnail: this.getBadgeIconUrlWithTransform(iconKey, { width: 64, height: 64 })
        };
    }

    // ==================== PRIVATE HELPER METHODS ====================

    /**
     * Check if mimetype is an image
     * @private
     */
    _isImageType(mimetype) {
        const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        return imageTypes.includes(mimetype);
    }

    /**
     * Format bytes to human readable
     * @private
     */
    _formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }
}

module.exports = new BadgeService();