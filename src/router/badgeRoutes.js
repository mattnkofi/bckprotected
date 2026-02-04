const express = require('express');
const router = express.Router();
const badgeController = require('../controller/badgeController');
// Use the middleware you already created
const upload = require('../middleware/upload'); 

// GET all badges
router.get('/', badgeController.getAllBadges);

// POST a new badge - 'badge' is the field name for the frontend FormData
router.post('/', upload.single('badge'), badgeController.createBadge);

// PUT (Update) a badge
router.put('/:id', upload.single('badge'), badgeController.updateBadge);

// DELETE a badge
router.delete('/:id', badgeController.deleteBadge);

module.exports = router;