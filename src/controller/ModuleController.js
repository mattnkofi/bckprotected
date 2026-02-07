// src/controller/ModuleController.js
const ModuleService = require('../services/ModuleService');
const { validateModuleFile, validateThumbnail } = require('../middleware/FileUploadMiddleware');

/**
 * Module Controller - HTTP request handlers
 */
class ModuleController {
    /**
     * Create a new module
     * POST /api/modules
     */
    async createModule(req, res) {
        try {
            const userId = req.user.id;

            // Validate required fields
            const { title } = req.body;
            if (!title) {
                return res.status(400).json({
                    success: false,
                    message: 'Title is required'
                });
            }

            const result = await ModuleService.createModule(req.body, userId);

            return res.status(201).json(result);
        } catch (error) {
            console.error('ModuleController.createModule error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to create module'
            });
        }
    }

    /**
     * Create module with files
     * POST /api/modules/with-files
     */
    async createModuleWithFiles(req, res) {
        try {
            const userId = req.user.id;

            // Validate required fields
            const { title } = req.body;
            if (!title) {
                return res.status(400).json({
                    success: false,
                    message: 'Title is required'
                });
            }

            // Create module first
            const moduleResult = await ModuleService.createModule(req.body, userId);
            const moduleId = moduleResult.module.id;

            // Handle file uploads
            const files = req.files;
            const uploadResults = {};

            // Upload module file (PDF/DOCX)
            if (files && files.module_file && files.module_file[0]) {
                const moduleFile = files.module_file[0];

                const fileValidation = validateModuleFile(moduleFile);
                if (!fileValidation.valid) {
                    // Delete the created module since file validation failed
                    await ModuleService.deleteModule(moduleId);
                    return res.status(400).json({
                        success: false,
                        message: fileValidation.error
                    });
                }

                const fileResult = await ModuleService.uploadModuleFile(
                    moduleId,
                    moduleFile.buffer,
                    moduleFile.mimetype,
                    moduleFile.originalname,
                    userId
                );

                uploadResults.file = fileResult.file;
            }

            // Upload thumbnail
            if (files && files.thumbnail && files.thumbnail[0]) {
                const thumbnail = files.thumbnail[0];

                const thumbValidation = validateThumbnail(thumbnail);
                if (!thumbValidation.valid) {
                    return res.status(400).json({
                        success: false,
                        message: thumbValidation.error
                    });
                }

                const thumbResult = await ModuleService.uploadModuleThumbnail(
                    moduleId,
                    thumbnail.buffer,
                    thumbnail.mimetype,
                    thumbnail.originalname,
                    userId
                );

                uploadResults.thumbnail = thumbResult.thumbnail;
            }

            // Get updated module
            const updatedModule = await ModuleService.getModuleById(moduleId, true);

            return res.status(201).json({
                success: true,
                message: 'Module created successfully',
                module: updatedModule.module,
                uploads: uploadResults
            });
        } catch (error) {
            console.error('ModuleController.createModuleWithFiles error:', error);
            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to create module with files'
            });
        }
    }

    /**
     * Get all modules with filters
     * GET /api/modules
     */
    async getModules(req, res) {
        try {
            const filters = {
                type: req.query.type,
                category: req.query.category,
                difficulty_level: req.query.difficulty_level,
                is_featured: req.query.is_featured === 'true',
                search: req.query.search,
                page: req.query.page,
                limit: req.query.limit,
                orderBy: req.query.orderBy,
                orderDirection: req.query.orderDirection,
                includeUnpublished: req.user && (req.user.role === 'admin' || req.user.role === 'educator')
            };

            const result = await ModuleService.getModules(filters);

            return res.status(200).json(result);
        } catch (error) {
            console.error('ModuleController.getModules error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch modules'
            });
        }
    }

    /**
     * Get featured modules
     * GET /api/modules/featured
     */
    async getFeaturedModules(req, res) {
        try {
            const limit = parseInt(req.query.limit) || 6;
            const result = await ModuleService.getFeaturedModules(limit);

            return res.status(200).json(result);
        } catch (error) {
            console.error('ModuleController.getFeaturedModules error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch featured modules'
            });
        }
    }

    /**
     * Get module by ID
     * GET /api/modules/:id
     */
    async getModuleById(req, res) {
        try {
            const moduleId = req.params.id;
            const userId = req.user ? req.user.id : null; // Get user ID from the authenticated request
            const includeUnpublished = req.user && (req.user.role === 'admin' || req.user.role === 'educator');

            const result = await ModuleService.getModuleById(moduleId, includeUnpublished);

            // Increment view count (non-blocking)
            ModuleService.incrementViewCount(moduleId, userId).catch(err => {
                console.error('Failed to increment view count:', err);
            });

            return res.status(200).json(result);
        } catch (error) {
            console.error('ModuleController.getModuleById error:', error);

            if (error.message === 'Module not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Module not found'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to fetch module'
            });
        }
    }

    /**
     * Update module metadata
     * PUT /api/modules/:id
     */
    async updateModule(req, res) {
        try {
            const moduleId = req.params.id;
            const userId = req.user.id;

            const result = await ModuleService.updateModule(moduleId, req.body, userId);

            return res.status(200).json({
                success: true,
                message: 'Module updated successfully',
                module: result.module
            });
        } catch (error) {
            console.error('ModuleController.updateModule error:', error);

            if (error.message === 'Module not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Module not found'
                });
            }

            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to update module'
            });
        }
    }

    /**
     * Upload/Replace module file
     * POST /api/modules/:id/file
     */
    async uploadModuleFile(req, res) {
        try {
            const moduleId = req.params.id;
            const userId = req.user.id;
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'No file provided'
                });
            }

            // Validate file
            const validation = validateModuleFile(file);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.error
                });
            }

            const result = await ModuleService.uploadModuleFile(
                moduleId,
                file.buffer,
                file.mimetype,
                file.originalname,
                userId
            );

            return res.status(200).json({
                success: true,
                message: 'Module file uploaded successfully',
                file: result.file
            });
        } catch (error) {
            console.error('ModuleController.uploadModuleFile error:', error);

            if (error.message === 'Module not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Module not found'
                });
            }

            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to upload file'
            });
        }
    }

    /**
     * Upload/Replace thumbnail
     * POST /api/modules/:id/thumbnail
     */
    async uploadThumbnail(req, res) {
        try {
            const moduleId = req.params.id;
            const userId = req.user.id;
            const file = req.file;

            if (!file) {
                return res.status(400).json({
                    success: false,
                    message: 'No thumbnail provided'
                });
            }

            // Validate thumbnail
            const validation = validateThumbnail(file);
            if (!validation.valid) {
                return res.status(400).json({
                    success: false,
                    message: validation.error
                });
            }

            const result = await ModuleService.uploadModuleThumbnail(
                moduleId,
                file.buffer,
                file.mimetype,
                file.originalname,
                userId
            );

            return res.status(200).json({
                success: true,
                message: 'Thumbnail uploaded successfully',
                thumbnail: result.thumbnail
            });
        } catch (error) {
            console.error('ModuleController.uploadThumbnail error:', error);

            if (error.message === 'Module not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Module not found'
                });
            }

            return res.status(500).json({
                success: false,
                message: error.message || 'Failed to upload thumbnail'
            });
        }
    }

    /**
     * Delete module (soft delete)
     * DELETE /api/modules/:id
     */
    async deleteModule(req, res) {
        try {
            const moduleId = req.params.id;

            const result = await ModuleService.deleteModule(moduleId);

            return res.status(200).json(result);
        } catch (error) {
            console.error('ModuleController.deleteModule error:', error);

            if (error.message === 'Module not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Module not found'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to delete module'
            });
        }
    }

    /**
     * Permanently delete module
     * DELETE /api/modules/:id/permanent
     */
    async permanentlyDeleteModule(req, res) {
        try {
            const moduleId = req.params.id;

            const result = await ModuleService.permanentlyDeleteModule(moduleId);

            return res.status(200).json(result);
        } catch (error) {
            console.error('ModuleController.permanentlyDeleteModule error:', error);

            if (error.message === 'Module not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Module not found'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to permanently delete module'
            });
        }
    }

    /**
     * Toggle publish status
     * PATCH /api/modules/:id/publish
     */
    async togglePublish(req, res) {
        try {
            const moduleId = req.params.id;
            const userId = req.user.id;

            const result = await ModuleService.togglePublish(moduleId, userId);

            return res.status(200).json(result);
        } catch (error) {
            console.error('ModuleController.togglePublish error:', error);

            if (error.message === 'Module not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Module not found'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to toggle publish status'
            });
        }
    }

    /**
     * Toggle featured status
     * PATCH /api/modules/:id/featured
     */
    async toggleFeatured(req, res) {
        try {
            const moduleId = req.params.id;
            const userId = req.user.id;

            const result = await ModuleService.toggleFeatured(moduleId, userId);

            return res.status(200).json(result);
        } catch (error) {
            console.error('ModuleController.toggleFeatured error:', error);

            if (error.message === 'Module not found') {
                return res.status(404).json({
                    success: false,
                    message: 'Module not found'
                });
            }

            return res.status(500).json({
                success: false,
                message: 'Failed to toggle featured status'
            });
        }
    }

    // /**
    //  * Mark module as completed
    //  * POST /api/modules/:id/complete
    //  */
    // async markComplete(req, res) {
    //     try {
    //         const moduleId = req.params.id;

    //         // Increment completion count (non-blocking)
    //         ModuleService.incrementCompletionCount(moduleId).catch(err => {
    //             console.error('Failed to increment completion count:', err);
    //         });

    //         // TODO: Track user progress in a separate table
    //         // This is just incrementing the counter for now

    //         return res.status(200).json({
    //             success: true,
    //             message: 'Module marked as complete'
    //         });
    //     } catch (error) {
    //         console.error('ModuleController.markComplete error:', error);
    //         return res.status(500).json({
    //             success: false,
    //             message: 'Failed to mark module as complete'
    //         });
    //     }
    // }

    /**
     * Get module statistics
     * GET /api/modules/stats
     */
    async getStats(req, res) {
        try {
            const result = await ModuleService.getModuleStats();

            return res.status(200).json(result);
        } catch (error) {
            console.error('ModuleController.getStats error:', error);
            return res.status(500).json({
                success: false,
                message: 'Failed to fetch module statistics'
            });
        }
    }
}

module.exports = new ModuleController();