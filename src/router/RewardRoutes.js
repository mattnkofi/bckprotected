// routes/rewardRoutes.js
const express = require('express');
const router = express.Router();
const rewardController = require('../controllers/rewardController');

// User reward routes (place BEFORE generic routes to avoid conflicts)
router.post('/check', rewardController.checkRewardsForUser);
router.get('/user/:userId', rewardController.getUserRewards);
router.get('/user/:userId/progress', rewardController.getUserRewardProgress);
router.get('/user/:userId/stats', rewardController.getUserRewardStats);
router.patch('/user/:userId/view/:userRewardId', rewardController.markRewardViewed);
router.patch('/user/:userId/view-all', rewardController.markAllRewardsViewed);

// Admin reward CRUD routes
router.get('/', rewardController.getAllRewards);
router.get('/:id', rewardController.getRewardById);
router.post('/', rewardController.createReward);
router.put('/:id', rewardController.updateReward);
router.delete('/:id', rewardController.deleteReward);

module.exports = router;