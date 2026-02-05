// src/middleware/FileUploadMiddleware.js
const multer = require('multer');
const path = require('path');

/**
 * File Upload Middleware for Module Resources
 * ONLY accepts PDF and Word documents
 */

// ==================== CONFIGURATION ====================

const FILE_CONFIG = {
    // Allowed MIME types (PDF and Word only)
    allowedMimeTypes: [
        'application/pdf',
        'application/msword', // .doc
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' // .docx
    ],

    // Allowed extensions
    allowedExtensions: ['.pdf', '.doc', '.docx'],

    // File size limits (in bytes)
    maxFileSize: 25 * 1024 * 1024, // 25MB

    // Field names
    fields: {
        moduleFile: 'module_file',
        thumbnail: 'thumbnail'
    }
};

// ==================== MULTER CONFIGURATION ====================

// Memory storage (we'll process the buffer and upload to R2)
const storage = multer.memoryStorage();

// File filter - validates file type
const fileFilter = (req, file, cb) => {
    const fieldName = file.fieldname;

    // Different validation for different fields
    if (fieldName === FILE_CONFIG.fields.moduleFile) {
        // Module file: ONLY PDF and Word
        if (FILE_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
            const ext = path.extname(file.originalname).toLowerCase();
            if (FILE_CONFIG.allowedExtensions.includes(ext)) {
                return cb(null, true);
            }
        }

        return cb(new Error('Invalid file type. Only PDF and Word documents (.pdf, .doc, .docx) are allowed.'), false);
    }
    else if (fieldName === FILE_CONFIG.fields.thumbnail) {
        // Thumbnail: images only
        const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (allowedImageTypes.includes(file.mimetype)) {
            return cb(null, true);
        }

        return cb(new Error('Invalid thumbnail type. Only images (JPEG, PNG, WebP) are allowed.'), false);
    }

    return cb(new Error('Unexpected field'), false);
};

// ==================== MULTER INSTANCES ====================

/**
 * Upload for creating/updating modules
 * Accepts both module file and thumbnail
 */
const uploadModuleFiles = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: FILE_CONFIG.maxFileSize,
        files: 2 // Max 2 files (1 module file + 1 thumbnail)
    }
}).fields([
    { name: FILE_CONFIG.fields.moduleFile, maxCount: 1 },
    { name: FILE_CONFIG.fields.thumbnail, maxCount: 1 }
]);

/**
 * Upload for module file only
 */
const uploadModuleFile = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: FILE_CONFIG.maxFileSize,
        files: 1
    }
}).single(FILE_CONFIG.fields.moduleFile);

/**
 * Upload for thumbnail only
 */
const uploadThumbnail = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB for images
        files: 1
    }
}).single(FILE_CONFIG.fields.thumbnail);

// ==================== ERROR HANDLER MIDDLEWARE ====================

/**
 * Handle Multer errors and provide user-friendly messages
 */
const handleUploadError = (err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // Multer-specific errors
        switch (err.code) {
            case 'LIMIT_FILE_SIZE':
                return res.status(400).json({
                    success: false,
                    message: `File size exceeds the maximum allowed size of ${FILE_CONFIG.maxFileSize / (1024 * 1024)}MB`
                });
            case 'LIMIT_FILE_COUNT':
                return res.status(400).json({
                    success: false,
                    message: 'Too many files uploaded'
                });
            case 'LIMIT_UNEXPECTED_FILE':
                return res.status(400).json({
                    success: false,
                    message: 'Unexpected field in upload'
                });
            default:
                return res.status(400).json({
                    success: false,
                    message: `Upload error: ${err.message}`
                });
        }
    } else if (err) {
        // Custom errors from fileFilter
        return res.status(400).json({
            success: false,
            message: err.message
        });
    }

    next();
};

// ==================== VALIDATION HELPERS ====================

/**
 * Validate uploaded module file
 */
const validateModuleFile = (file) => {
    if (!file) {
        return { valid: false, error: 'No file provided' };
    }

    // Check mime type
    if (!FILE_CONFIG.allowedMimeTypes.includes(file.mimetype)) {
        return {
            valid: false,
            error: 'Invalid file type. Only PDF and Word documents are allowed.'
        };
    }

    // Check extension
    const ext = path.extname(file.originalname).toLowerCase();
    if (!FILE_CONFIG.allowedExtensions.includes(ext)) {
        return {
            valid: false,
            error: 'Invalid file extension. Only .pdf, .doc, and .docx are allowed.'
        };
    }

    // Check file size
    if (file.size > FILE_CONFIG.maxFileSize) {
        return {
            valid: false,
            error: `File size exceeds ${FILE_CONFIG.maxFileSize / (1024 * 1024)}MB limit`
        };
    }

    return { valid: true };
};

/**
 * Validate uploaded thumbnail
 */
const validateThumbnail = (file) => {
    if (!file) {
        return { valid: false, error: 'No thumbnail provided' };
    }

    const allowedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

    if (!allowedImageTypes.includes(file.mimetype)) {
        return {
            valid: false,
            error: 'Invalid thumbnail type. Only JPEG, PNG, and WebP images are allowed.'
        };
    }

    const maxThumbnailSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxThumbnailSize) {
        return {
            valid: false,
            error: 'Thumbnail size exceeds 5MB limit'
        };
    }

    return { valid: true };
};

// ==================== MIDDLEWARE WRAPPERS ====================

/**
 * Wrapper for uploadModuleFiles with error handling
 */
const uploadModuleFilesMiddleware = (req, res, next) => {
    uploadModuleFiles(req, res, (err) => {
        handleUploadError(err, req, res, next);
    });
};

/**
 * Wrapper for uploadModuleFile with error handling
 */
const uploadModuleFileMiddleware = (req, res, next) => {
    uploadModuleFile(req, res, (err) => {
        handleUploadError(err, req, res, next);
    });
};

/**
 * Wrapper for uploadThumbnail with error handling
 */
const uploadThumbnailMiddleware = (req, res, next) => {
    uploadThumbnail(req, res, (err) => {
        handleUploadError(err, req, res, next);
    });
};

// ==================== EXPORTS ====================

module.exports = {
    // Middleware
    uploadModuleFiles: uploadModuleFilesMiddleware,
    uploadModuleFile: uploadModuleFileMiddleware,
    uploadThumbnail: uploadThumbnailMiddleware,

    // Validators
    validateModuleFile,
    validateThumbnail,

    // Config
    FILE_CONFIG
};