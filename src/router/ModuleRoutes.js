// src/routes/ModuleRoutes.js
const express = require('express');
const router = express.Router();
const ModuleController = require('../controller/ModuleController');
const { authenticate, optionalAuth } = require('../middleware/AuthMiddleware');
const {
    uploadModuleFiles,
    uploadModuleFile,
    uploadThumbnail
} = require('../middleware/FileUploadMiddleware');

// ==================== PUBLIC ROUTES ====================

/**
 * Get all published modules (with filters)
 * GET /api/modules?category=gad&type=lesson&difficulty_level=beginner&search=health
 */
router.get('/', ModuleController.getModules);

/**
 * Get featured modules
 * GET /api/modules/featured?limit=6
 */
router.get('/featured', ModuleController.getFeaturedModules);

/**
 * Get module statistics
 * GET /api/modules/stats
 */
router.get('/stats', ModuleController.getStats);

/**
 * Get single module by ID
 * GET /api/modules/:id
 */
router.get('/:id', optionalAuth, ModuleController.getModuleById);

// ==================== PROTECTED ROUTES ====================
// All routes below require authentication

router.use(authenticate);

// /**
//  * Mark module as completed
//  * POST /api/modules/:id/complete
//  */
// router.post('/:id/complete', ModuleController.markComplete);

// ==================== ADMIN/EDUCATOR ROUTES ====================
// Routes below require admin or educator role

const requireEducator = (req, res, next) => {
    if (req.user.role === 'admin' || req.user.role === 'educator') {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'Access denied. Educator or Admin role required.'
    });
};

// router.use(requireEducator);

/**
 * Create module without files
 * POST /api/modules
 * Body: { title, description, content, type, category, difficulty_level, ... }
 */
router.post('/', ModuleController.createModule);

/**
 * Create module with files (PDF/DOCX + thumbnail)
 * POST /api/modules/with-files
 * Form-data:
 *   - module_file: PDF or DOCX file
 *   - thumbnail: Image file (optional)
 *   - title, description, etc. (text fields)
 */
router.post('/with-files', uploadModuleFiles, ModuleController.createModuleWithFiles);

/**
 * Update module metadata
 * PUT /api/modules/:id
 * Body: { title, description, content, type, category, ... }
 */
router.put('/:id', ModuleController.updateModule);

/**
 * Upload/Replace module file (PDF/DOCX)
 * POST /api/modules/:id/file
 * Form-data: module_file
 */
router.post('/:id/file', uploadModuleFile, ModuleController.uploadModuleFile);

/**
 * Upload/Replace thumbnail
 * POST /api/modules/:id/thumbnail
 * Form-data: thumbnail
 */
router.post('/:id/thumbnail', uploadThumbnail, ModuleController.uploadThumbnail);

/**
 * Toggle publish status
 * PATCH /api/modules/:id/publish
 */
router.patch('/:id/publish', ModuleController.togglePublish);

/**
 * Toggle featured status
 * PATCH /api/modules/:id/featured
 */
router.patch('/:id/featured', ModuleController.toggleFeatured);

/**
 * Soft delete module
 * DELETE /api/modules/:id
 */
router.delete('/:id', ModuleController.deleteModule);

// ==================== ADMIN-ONLY ROUTES ====================

const requireAdmin = (req, res, next) => {
    if (req.user.role === 'admin') {
        return next();
    }
    return res.status(403).json({
        success: false,
        message: 'Access denied. Admin role required.'
    });
};

router.use(requireAdmin);

/**
 * Permanently delete module and files
 * DELETE /api/modules/:id/permanent
 */
router.delete('/:id/permanent', ModuleController.permanentlyDeleteModule);

module.exports = router;