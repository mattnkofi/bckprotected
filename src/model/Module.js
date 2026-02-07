// src/model/Module.js
module.exports = (sequelize, DataTypes) => {
    const Module = sequelize.define('Module', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        title: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                notEmpty: { msg: 'Module title is required' },
                len: {
                    args: [3, 255],
                    msg: 'Title must be between 3 and 255 characters'
                }
            }
        },
        description: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        content: {
            type: DataTypes.TEXT('long'),
            allowNull: true
        },
        // type: {
        //     type: DataTypes.ENUM('lesson', 'quiz', 'activity', 'resource', 'assessment'),
        //     allowNull: false,
        //     defaultValue: 'lesson',
        //     validate: {
        //         isIn: {
        //             args: [['lesson', 'quiz', 'activity', 'resource', 'assessment']],
        //             msg: 'Invalid module type'
        //         }
        //     }
        // },
        category: {
            type: DataTypes.ENUM('gad', 'sexual_health', 'vawc', 'general'),
            allowNull: false,
            defaultValue: 'general',
            validate: {
                isIn: {
                    args: [['gad', 'sexual_health', 'vawc', 'general']],
                    msg: 'Invalid category'
                }
            }
        },
        difficulty_level: {
            type: DataTypes.ENUM('beginner', 'intermediate', 'advanced'),
            allowNull: false,
            defaultValue: 'beginner'
        },
        age_group: {
            type: DataTypes.STRING(50),
            allowNull: true
        },
        file_key: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'R2 storage key for PDF/DOCX file'
        },
        file_name: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        file_type: {
            type: DataTypes.STRING(100),
            allowNull: true
        },
        file_size: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        thumbnail_key: {
            type: DataTypes.STRING(500),
            allowNull: true
        },
        // duration_minutes: {
        //     type: DataTypes.INTEGER,
        //     allowNull: true,
        //     validate: {
        //         min: { args: [1], msg: 'Duration must be at least 1 minute' }
        //     }
        // },
        // points: {
        //     type: DataTypes.INTEGER,
        //     allowNull: false,
        //     defaultValue: 0,
        //     validate: {
        //         min: { args: [0], msg: 'Points cannot be negative' }
        //     }
        // },
        order: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        is_published: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        is_featured: {
            type: DataTypes.BOOLEAN,
            allowNull: false,
            defaultValue: false
        },
        required_modules: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        },
        tags: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: []
        },
        metadata: {
            type: DataTypes.JSON,
            allowNull: true,
            defaultValue: {}
        },
        created_by: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        updated_by: {
            type: DataTypes.INTEGER,
            allowNull: true
        },
        view_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        completion_count: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        published_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        deleted_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        timestamps: true,
        underscored: true,
        tableName: 'Modules',
        paranoid: true, // Enable soft deletes
        indexes: [
            { fields: ['type'] },
            { fields: ['category'] },
            { fields: ['difficulty_level'] },
            { fields: ['is_published'] },
            { fields: ['is_featured'] },
            { fields: ['created_by'] },
            { fields: ['order'] }
        ]
    });

    // ==================== ASSOCIATIONS ====================
    Module.associate = function (models) {
        // Creator
        Module.belongsTo(models.User, {
            foreignKey: 'created_by',
            as: 'creator',
            onDelete: 'RESTRICT'
        });

        // Last updater
        Module.belongsTo(models.User, {
            foreignKey: 'updated_by',
            as: 'updater',
            onDelete: 'SET NULL'
        });

        // User progress tracking (if you have this table)
        if (models.ModuleProgress) {
            Module.hasMany(models.ModuleProgress, {
                foreignKey: 'module_id',
                as: 'userProgress',
                onDelete: 'CASCADE'
            });
        }

        // Quiz/Assessment questions (if applicable)
        if (models.Question) {
            Module.hasMany(models.Question, {
                foreignKey: 'module_id',
                as: 'questions',
                onDelete: 'CASCADE'
            });
        }
    };

    // ==================== INSTANCE METHODS ====================

    /**
     * Get file URL from key
     */
    Module.prototype.getFileUrl = function () {
        if (!this.file_key) return null;

        try {
            const fileStorageService = require('../services/FileStorageService');
            return fileStorageService.constructUrl(this.file_key);
        } catch (error) {
            console.error('Error constructing file URL:', error);
            return null;
        }
    };

    /**
     * Get thumbnail URL from key
     */
    Module.prototype.getThumbnailUrl = function () {
        if (!this.thumbnail_key) return null;

        try {
            const fileStorageService = require('../services/FileStorageService');
            return fileStorageService.constructUrl(this.thumbnail_key);
        } catch (error) {
            console.error('Error constructing thumbnail URL:', error);
            return null;
        }
    };

    /**
     * Increment view count
     */
    Module.prototype.incrementViewCount = async function () {
        this.view_count += 1;
        await this.save({ fields: ['view_count'], hooks: false });
    };

    /**
     * Increment completion count
     */
    Module.prototype.incrementCompletionCount = async function () {
        this.completion_count += 1;
        await this.save({ fields: ['completion_count'], hooks: false });
    };

    /**
     * Publish module
     */
    Module.prototype.publish = async function () {
        this.is_published = true;
        if (!this.published_at) {
            this.published_at = new Date();
        }
        await this.save();
    };

    /**
     * Unpublish module
     */
    Module.prototype.unpublish = async function () {
        this.is_published = false;
        await this.save();
    };

    /**
     * Toggle featured status
     */
    Module.prototype.toggleFeatured = async function () {
        this.is_featured = !this.is_featured;
        await this.save();
    };

    /**
     * Check if module has a file
     */
    Module.prototype.hasFile = function () {
        return !!this.file_key;
    };

    /**
     * Check if module has a thumbnail
     */
    Module.prototype.hasThumbnail = function () {
        return !!this.thumbnail_key;
    };

    /**
     * Get safe JSON for API responses
     */
    Module.prototype.toSafeJSON = function () {
        const data = {
            id: this.id,
            title: this.title,
            description: this.description,
            content: this.content,
            type: this.type,
            category: this.category,
            difficulty_level: this.difficulty_level,
            age_group: this.age_group,
            file_url: this.getFileUrl(),
            file_name: this.file_name,
            file_type: this.file_type,
            file_size: this.file_size,
            thumbnail_url: this.getThumbnailUrl(),
            duration_minutes: this.duration_minutes,
            points: this.points,
            order: this.order,
            is_published: this.is_published,
            is_featured: this.is_featured,
            required_modules: this.required_modules || [],
            tags: this.tags || [],
            metadata: this.metadata || {},
            view_count: this.view_count,
            completion_count: this.completion_count,
            created_at: this.created_at,
            updated_at: this.updated_at,
            published_at: this.published_at
        };

        // Include creator info if loaded
        if (this.creator) {
            data.creator = {
                id: this.creator.id,
                name: this.creator.name,
                email: this.creator.email
            };
        }

        return data;
    };

    /**
     * Default JSON serialization
     */
    Module.prototype.toJSON = function () {
        const values = { ...this.get() };
        // Hide internal storage keys
        delete values.file_key;
        delete values.thumbnail_key;
        // Add computed URLs
        values.file_url = this.getFileUrl();
        values.thumbnail_url = this.getThumbnailUrl();
        return values;
    };

    // ==================== CLASS METHODS ====================

    /**
     * Find published modules
     */
    Module.findPublished = async function (options = {}) {
        return await this.findAll({
            where: { is_published: true },
            order: [['order', 'ASC'], ['created_at', 'DESC']],
            ...options
        });
    };

    /**
     * Find featured modules
     */
    Module.findFeatured = async function (options = {}) {
        return await this.findAll({
            where: { is_published: true, is_featured: true },
            order: [['order', 'ASC']],
            limit: 6,
            ...options
        });
    };

    /**
     * Find by category
     */
    Module.findByCategory = async function (category, options = {}) {
        return await this.findAll({
            where: { category, is_published: true },
            order: [['order', 'ASC']],
            ...options
        });
    };

    /**
     * Find by type
     */
    Module.findByType = async function (type, options = {}) {
        return await this.findAll({
            where: { type, is_published: true },
            order: [['order', 'ASC']],
            ...options
        });
    };

    /**
     * Search modules
     */
    Module.search = async function (query, options = {}) {
        const { Op } = require('sequelize');
        return await this.findAll({
            where: {
                is_published: true,
                [Op.or]: [
                    { title: { [Op.like]: `%${query}%` } },
                    { description: { [Op.like]: `%${query}%` } },
                    { tags: { [Op.like]: `%${query}%` } }
                ]
            },
            order: [['order', 'ASC']],
            ...options
        });
    };

    // ==================== HOOKS ====================

    /**
     * Before destroy hook - cleanup files from storage
     */
    Module.beforeDestroy(async (module, options) => {
        try {
            const fileStorageService = require('../services/FileStorageService');

            // Delete main file
            if (module.file_key) {
                await fileStorageService.deleteFile(module.file_key).catch(err => {
                    console.error(`Failed to delete module file: ${module.file_key}`, err);
                });
            }

            // Delete thumbnail
            if (module.thumbnail_key) {
                await fileStorageService.deleteFile(module.thumbnail_key).catch(err => {
                    console.error(`Failed to delete module thumbnail: ${module.thumbnail_key}`, err);
                });
            }
        } catch (error) {
            console.error('Error in Module.beforeDestroy hook:', error);
        }
    });

    return Module;
};