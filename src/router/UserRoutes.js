// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const userController = require('../controller/UserController');
const { authenticate, requireRole } = require('../middleware/AuthMiddleware');

// User score management (authenticated users)
router.post('/update-score', authenticate, userController.updateScore);
router.get('/stats', authenticate, userController.getUserStats);

// Award points (admin/facilitator only)
router.post(
    '/:userId/award-points',
    authenticate,
    requireRole(['admin', 'educator']),
    userController.awardPoints
);

module.exports = router;