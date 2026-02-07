// src/services/ModuleService.js
const { Module, User, ModuleView } = require('../model'); // Import from the index.js loader
const FileStorageService = require('./FileStorageService');
const { Op } = require('sequelize');

/**
 * Module Service - Business logic for module management
 */
class ModuleService {
    /**
     * Create a new module
     */
    async createModule(data, createdBy) {
        try {
            const moduleData = {
                title: data.title,
                description: data.description,
                content: data.content,
                type: data.type || 'lesson',
                category: data.category || 'general',
                difficulty_level: data.difficulty_level || 'beginner',
                age_group: data.age_group,
                // duration_minutes: data.duration_minutes,
                // points: data.points || 0,
                order: data.order || 0,
                is_published: data.is_published || false,
                is_featured: data.is_featured || false,
                required_modules: data.required_modules || [],
                tags: data.tags || [],
                metadata: data.metadata || {},
                created_by: createdBy
            };

            const module = await Module.create(moduleData);

            return {
                success: true,
                module: module.toSafeJSON()
            };
        } catch (error) {
            console.error('ModuleService.createModule error:', error);
            throw error;
        }
    }

    /**
     * Upload module file (PDF/DOCX)
     */
    async uploadModuleFile(moduleId, fileBuffer, mimetype, originalFilename, uploadedBy) {
        try {
            const module = await Module.findByPk(moduleId);
            if (!module) {
                throw new Error('Module not found');
            }

            // Delete old file if exists
            if (module.file_key) {
                await FileStorageService.deleteFile(module.file_key).catch(err => {
                    console.warn('Failed to delete old module file:', err);
                });
            }

            // Upload new file
            const uploadResult = await FileStorageService.uploadModuleFile(
                fileBuffer,
                moduleId,
                'resource',
                mimetype,
                originalFilename,
                { uploadedBy }
            );

            // Update module with file info
            await module.update({
                file_key: uploadResult.key,
                file_name: originalFilename,
                file_type: mimetype,
                file_size: uploadResult.size,
                updated_by: uploadedBy
            });

            return {
                success: true,
                file: {
                    url: uploadResult.url,
                    name: originalFilename,
                    type: mimetype,
                    size: uploadResult.size
                }
            };
        } catch (error) {
            console.error('ModuleService.uploadModuleFile error:', error);
            throw error;
        }
    }

    /**
     * Upload module thumbnail
     */
    async uploadModuleThumbnail(moduleId, fileBuffer, mimetype, originalFilename, uploadedBy) {
        try {
            const module = await Module.findByPk(moduleId);
            if (!module) {
                throw new Error('Module not found');
            }

            // Delete old thumbnail if exists
            if (module.thumbnail_key) {
                await FileStorageService.deleteFile(module.thumbnail_key).catch(err => {
                    console.warn('Failed to delete old thumbnail:', err);
                });
            }

            // Upload new thumbnail
            const uploadResult = await FileStorageService.uploadModuleFile(
                fileBuffer,
                moduleId,
                'thumbnail',
                mimetype,
                originalFilename,
                { uploadedBy }
            );

            // Update module
            await module.update({
                thumbnail_key: uploadResult.key,
                updated_by: uploadedBy
            });

            return {
                success: true,
                thumbnail: {
                    url: uploadResult.url
                }
            };
        } catch (error) {
            console.error('ModuleService.uploadModuleThumbnail error:', error);
            throw error;
        }
    }

    /**
     * Update module metadata
     */
    async updateModule(moduleId, data, updatedBy) {
        try {
            const module = await Module.findByPk(moduleId);
            if (!module) {
                throw new Error('Module not found');
            }

            const updateData = {
                updated_by: updatedBy
            };

            // Only update fields that are provided
            const allowedFields = [
                'title', 'description', 'content', 'type', 'category',
                'difficulty_level', 'age_group',
                // 'duration_minutes', 'points',
                'order', 'is_published', 'is_featured', 'required_modules',
                'tags', 'metadata'
            ];

            allowedFields.forEach(field => {
                if (data[field] !== undefined) {
                    updateData[field] = data[field];
                }
            });

            await module.update(updateData);

            return {
                success: true,
                module: module.toSafeJSON()
            };
        } catch (error) {
            console.error('ModuleService.updateModule error:', error);
            throw error;
        }
    }

    /**
     * Delete module (soft delete)
     */
    async deleteModule(moduleId) {
        try {
            const module = await Module.findByPk(moduleId);
            if (!module) {
                throw new Error('Module not found');
            }

            // Soft delete (paranoid: true in model)
            await module.destroy();

            return {
                success: true,
                message: 'Module deleted successfully'
            };
        } catch (error) {
            console.error('ModuleService.deleteModule error:', error);
            throw error;
        }
    }

    /**
     * Permanently delete module and files
     */
    async permanentlyDeleteModule(moduleId) {
        try {
            const module = await Module.findByPk(moduleId, { paranoid: false });
            if (!module) {
                throw new Error('Module not found');
            }

            // Delete files from storage
            if (module.file_key) {
                await FileStorageService.deleteFile(module.file_key).catch(err => {
                    console.error('Failed to delete module file:', err);
                });
            }

            if (module.thumbnail_key) {
                await FileStorageService.deleteFile(module.thumbnail_key).catch(err => {
                    console.error('Failed to delete thumbnail:', err);
                });
            }

            // Hard delete from database
            await module.destroy({ force: true });

            return {
                success: true,
                message: 'Module permanently deleted'
            };
        } catch (error) {
            console.error('ModuleService.permanentlyDeleteModule error:', error);
            throw error;
        }
    }

    /**
     * Get module by ID
     */
    async getModuleById(moduleId, includeUnpublished = false) {
        try {
            const where = { id: moduleId };
            if (!includeUnpublished) {
                where.is_published = true;
            }

            const module = await Module.findOne({
                where,
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'email']
                }]
            });

            if (!module) {
                throw new Error('Module not found');
            }

            return {
                success: true,
                module: module.toSafeJSON()
            };
        } catch (error) {
            console.error('ModuleService.getModuleById error:', error);
            throw error;
        }
    }

    /**
     * Get all modules with filtering
     */
    async getModules(filters = {}) {
        try {
            const where = {};
            const order = [];

            // Apply filters
            // if (filters.type) where.type = filters.type;
            if (filters.category) where.category = filters.category;
            if (filters.difficulty_level) where.difficulty_level = filters.difficulty_level;
            if (filters.is_featured !== undefined) where.is_featured = filters.is_featured;

            // Only show published unless admin
            if (!filters.includeUnpublished) {
                where.is_published = true;
            }

            // Search
            if (filters.search) {
                where[Op.or] = [
                    { title: { [Op.like]: `%${filters.search}%` } },
                    { description: { [Op.like]: `%${filters.search}%` } }
                ];
            }

            // Ordering
            if (filters.orderBy) {
                const direction = filters.orderDirection || 'ASC';
                order.push([filters.orderBy, direction]);
            } else {
                order.push(['order', 'ASC'], ['created_at', 'DESC']);
            }

            // Pagination
            const page = parseInt(filters.page) || 1;
            const limit = parseInt(filters.limit) || 20;
            const offset = (page - 1) * limit;

            const { count, rows } = await Module.findAndCountAll({
                where,
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name', 'email']
                }],
                order,
                limit,
                offset
            });

            const modules = rows.map(module => module.toSafeJSON());

            return {
                success: true,
                modules,
                pagination: {
                    total: count,
                    page,
                    limit,
                    totalPages: Math.ceil(count / limit)
                }
            };
        } catch (error) {
            console.error('ModuleService.getModules error:', error);
            throw error;
        }
    }

    /**
     * Get featured modules
     */
    async getFeaturedModules(limit = 6) {
        try {
            const modules = await Module.findAll({
                where: {
                    is_published: true,
                    is_featured: true
                },
                include: [{
                    model: User,
                    as: 'creator',
                    attributes: ['id', 'name']
                }],
                order: [['order', 'ASC']],
                limit
            });

            return {
                success: true,
                modules: modules.map(m => m.toSafeJSON())
            };
        } catch (error) {
            console.error('ModuleService.getFeaturedModules error:', error);
            throw error;
        }
    }

    /**
     * Publish/unpublish module
     */
    async togglePublish(moduleId, updatedBy) {
        try {
            const module = await Module.findByPk(moduleId);
            if (!module) {
                throw new Error('Module not found');
            }

            if (module.is_published) {
                await module.unpublish();
            } else {
                await module.publish();
            }

            await module.update({ updated_by: updatedBy });

            return {
                success: true,
                is_published: module.is_published,
                message: module.is_published ? 'Module published' : 'Module unpublished'
            };
        } catch (error) {
            console.error('ModuleService.togglePublish error:', error);
            throw error;
        }
    }

    /**
     * Toggle featured status
     */
    async toggleFeatured(moduleId, updatedBy) {
        try {
            const module = await Module.findByPk(moduleId);
            if (!module) {
                throw new Error('Module not found');
            }

            await module.toggleFeatured();
            await module.update({ updated_by: updatedBy });

            return {
                success: true,
                is_featured: module.is_featured,
                message: module.is_featured ? 'Module featured' : 'Module unfeatured'
            };
        } catch (error) {
            console.error('ModuleService.toggleFeatured error:', error);
            throw error;
        }
    }

    // /**
    //  * Increment view count
    //  */
    // async incrementViewCount(moduleId) {
    //     try {
    //         const module = await Module.findByPk(moduleId);
    //         if (module) {
    //             await module.incrementViewCount();
    //         }
    //     } catch (error) {
    //         console.error('ModuleService.incrementViewCount error:', error);
    //         // Don't throw - this is not critical
    //     }
    // }

    /**
     * Increment view count (Unique per user)
     */
    async incrementViewCount(moduleId, userId) {
        if (!userId) return; // Don't track views for guests if not required

        try {
            // Check if this user has already viewed this module
            const existingView = await ModuleView.findOne({
                where: { module_id: moduleId, user_id: userId }
            });

            if (!existingView) {
                // Record the unique view
                await ModuleView.create({ module_id: moduleId, user_id: userId });

                // Increment the total view count on the Module model
                const module = await Module.findByPk(moduleId);
                if (module) {
                    module.view_count += 1;
                    await module.save({ fields: ['view_count'], hooks: false });
                }
            }
        } catch (error) {
            console.error('ModuleService.incrementViewCount error:', error);
        }
    }

    // /**
    //  * Increment completion count
    //  */
    // async incrementCompletionCount(moduleId) {
    //     try {
    //         const module = await Module.findByPk(moduleId);
    //         if (module) {
    //             await module.incrementCompletionCount();
    //         }
    //     } catch (error) {
    //         console.error('ModuleService.incrementCompletionCount error:', error);
    //         // Don't throw - this is not critical
    //     }
    // }

    /**
     * Get module statistics
     */
    async getModuleStats() {
        try {
            const stats = await Module.findAll({
                attributes: [
                    'category',
                    [Module.sequelize.fn('COUNT', Module.sequelize.col('id')), 'count']
                ],
                where: { is_published: true },
                group: ['category']
            });

            const totalModules = await Module.count({ where: { is_published: true } });
            const totalViews = await Module.sum('view_count', { where: { is_published: true } });
            // const totalCompletions = await Module.sum('completion_count', { where: { is_published: true } });

            return {
                success: true,
                stats: {
                    total_modules: totalModules,
                    total_views: totalViews || 0,
                    // total_completions: totalCompletions || 0,
                    by_category: stats
                }
            };
        } catch (error) {
            console.error('ModuleService.getModuleStats error:', error);
            throw error;
        }
    }
}

module.exports = new ModuleService();