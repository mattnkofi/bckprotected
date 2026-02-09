// routes/badgeRoutes.js
const express = require('express');
const router = express.Router();
const badgeController = require('../controllers/badgeController');
const multer = require('multer');

// Configure multer for memory storage
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept images only
        if (!file.mimetype.startsWith('image/')) {
            return cb(new Error('Only image files are allowed'), false);
        }
        cb(null, true);
    }
});

// Metadata routes
router.get('/categories', badgeController.getCategories);
router.get('/rarities', badgeController.getRarities);

// CRUD routes
router.get('/', badgeController.getAllBadges);
router.get('/:id', badgeController.getBadgeById);
router.post('/', upload.single('icon'), badgeController.createBadge);
router.put('/:id', upload.single('icon'), badgeController.updateBadge);
router.delete('/:id', badgeController.deleteBadge);

module.exports = router;