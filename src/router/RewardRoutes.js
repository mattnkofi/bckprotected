// backend\src\router\RewardRoutes.js
const express = require('express');
const router = express.Router();
const rewardController = require('../controller/RewardController');
const { authenticate, requireRole } = require('../middleware/AuthMiddleware');

// ===== PUBLIC/USER ROUTES (require authentication) =====

// Get available rewards for user (with ability check)
router.get('/available', authenticate, rewardController.getAvailableRewards);

// Get user's redemption history
router.get('/my-redemptions', authenticate, rewardController.getMyRedemptions);

// Get user stats
router.get('/my-stats', authenticate, rewardController.getMyStats);

// Redeem a reward
router.post('/:id/redeem', authenticate, rewardController.redeemReward);

// Cancel a redemption
router.post('/redemptions/:id/cancel', authenticate, rewardController.cancelRedemption);

// ===== ADMIN/FACILITATOR ROUTES =====

// Get all redemptions (admin only)
router.get(
    '/admin/redemptions',
    authenticate,
    requireRole(['admin', 'educator']),
    rewardController.getAllRedemptions
);

// Update redemption status (admin only)
router.patch(
    '/admin/redemptions/:id',
    authenticate,
    requireRole(['admin', 'educator']),
    rewardController.updateRedemptionStatus
);

// CRUD operations for rewards (admin/facilitator only)
router.post(
    '/',
    authenticate,
    requireRole(['admin', 'educator']),
    rewardController.createReward
);

router.put(
    '/:id',
    authenticate,
    requireRole(['admin', 'educator']),
    rewardController.updateReward
);

router.delete(
    '/:id',
    authenticate,
    requireRole(['admin']),
    rewardController.deleteReward
);

// ===== PUBLIC ROUTES (should be last to avoid conflicts) =====

// Get all rewards (with optional filters)
router.get('/', rewardController.getAllRewards);

// Get single reward by ID
router.get('/:id', rewardController.getRewardById);

module.exports = router;