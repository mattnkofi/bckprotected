// controllers/rewardController.js
const { Reward, Badge } = require('../model');
const RewardService = require('../services/RewardService');
const { Op } = require('sequelize');

/**
 * Reward Controller - HTTP handlers for reward management
 */
class RewardController {
    /**
     * GET /api/rewards
     * Get all rewards
     */
    async getAllRewards(req, res) {
        try {
            const {
                rewardType,
                isActive,
                isRepeatable,
                search,
                page = 1,
                limit = 50,
                sortBy = 'sortOrder',
                sortOrder = 'ASC'
            } = req.query;

            // Build where clause
            const whereClause = {};

            if (rewardType) {
                whereClause.rewardType = rewardType;
            }

            if (isActive !== undefined) {
                whereClause.isActive = isActive === 'true';
            }

            if (isRepeatable !== undefined) {
                whereClause.isRepeatable = isRepeatable === 'true';
            }

            if (search) {
                whereClause[Op.or] = [
                    { name: { [Op.like]: `%${search}%` } },
                    { description: { [Op.like]: `%${search}%` } }
                ];
            }

            // Pagination
            const offset = (parseInt(page) - 1) * parseInt(limit);

            const { count, rows: rewards } = await Reward.findAndCountAll({
                where: whereClause,
                include: [{
                    model: Badge,
                    as: 'badge'
                }],
                limit: parseInt(limit),
                offset: offset,
                order: [[sortBy, sortOrder.toUpperCase()]]
            });

            res.json({
                success: true,
                data: rewards.map(r => r.toJSON()),
                pagination: {
                    total: count,
                    page: parseInt(page),
                    limit: parseInt(limit),
                    totalPages: Math.ceil(count / parseInt(limit))
                }
            });
        } catch (error) {
            console.error('Get all rewards error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch rewards',
                message: error.message
            });
        }
    }

    /**
     * GET /api/rewards/:id
     * Get reward by ID
     */
    async getRewardById(req, res) {
        try {
            const { id } = req.params;

            const reward = await Reward.findByPk(id, {
                include: [{
                    model: Badge,
                    as: 'badge'
                }]
            });

            if (!reward) {
                return res.status(404).json({
                    success: false,
                    error: 'Reward not found'
                });
            }

            res.json({
                success: true,
                data: reward.toJSON()
            });
        } catch (error) {
            console.error('Get reward by ID error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch reward',
                message: error.message
            });
        }
    }

    /**
     * POST /api/rewards
     * Create new reward
     */
    async createReward(req, res) {
        try {
            const {
                name,
                description,
                badgeId,
                rewardType,
                pointsValue,
                unlockContent,
                titleText,
                requiredScore,
                requiredLevel,
                isRepeatable,
                cooldownDays,
                isActive,
                validFrom,
                validUntil,
                sortOrder
            } = req.body;

            // Validate required fields
            if (!name) {
                return res.status(400).json({
                    success: false,
                    error: 'Reward name is required'
                });
            }

            if (requiredScore === undefined || requiredScore === null) {
                return res.status(400).json({
                    success: false,
                    error: 'Required score is required'
                });
            }

            // Validate badge exists if provided
            if (badgeId) {
                const badge = await Badge.findByPk(badgeId);
                if (!badge) {
                    return res.status(400).json({
                        success: false,
                        error: 'Badge not found'
                    });
                }
            }

            // Create reward
            const reward = await Reward.create({
                name,
                description,
                badgeId,
                rewardType: rewardType || 'badge',
                pointsValue,
                unlockContent,
                titleText,
                requiredScore,
                requiredLevel,
                isRepeatable: isRepeatable || false,
                cooldownDays,
                isActive: isActive !== undefined ? isActive : true,
                validFrom,
                validUntil,
                sortOrder: sortOrder || 0
            });

            // Fetch with badge data
            const createdReward = await Reward.findByPk(reward.id, {
                include: [{
                    model: Badge,
                    as: 'badge'
                }]
            });

            res.status(201).json({
                success: true,
                message: 'Reward created successfully',
                data: createdReward.toJSON()
            });
        } catch (error) {
            console.error('Create reward error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to create reward',
                message: error.message
            });
        }
    }

    /**
     * PUT /api/rewards/:id
     * Update reward
     */
    async updateReward(req, res) {
        try {
            const { id } = req.params;

            const reward = await Reward.findByPk(id);

            if (!reward) {
                return res.status(404).json({
                    success: false,
                    error: 'Reward not found'
                });
            }

            const {
                name,
                description,
                badgeId,
                rewardType,
                pointsValue,
                unlockContent,
                titleText,
                requiredScore,
                requiredLevel,
                isRepeatable,
                cooldownDays,
                isActive,
                validFrom,
                validUntil,
                sortOrder
            } = req.body;

            // Validate badge exists if provided
            if (badgeId !== undefined && badgeId !== null) {
                const badge = await Badge.findByPk(badgeId);
                if (!badge) {
                    return res.status(400).json({
                        success: false,
                        error: 'Badge not found'
                    });
                }
            }

            // Update fields
            if (name !== undefined) reward.name = name;
            if (description !== undefined) reward.description = description;
            if (badgeId !== undefined) reward.badgeId = badgeId;
            if (rewardType !== undefined) reward.rewardType = rewardType;
            if (pointsValue !== undefined) reward.pointsValue = pointsValue;
            if (unlockContent !== undefined) reward.unlockContent = unlockContent;
            if (titleText !== undefined) reward.titleText = titleText;
            if (requiredScore !== undefined) reward.requiredScore = requiredScore;
            if (requiredLevel !== undefined) reward.requiredLevel = requiredLevel;
            if (isRepeatable !== undefined) reward.isRepeatable = isRepeatable;
            if (cooldownDays !== undefined) reward.cooldownDays = cooldownDays;
            if (isActive !== undefined) reward.isActive = isActive;
            if (validFrom !== undefined) reward.validFrom = validFrom;
            if (validUntil !== undefined) reward.validUntil = validUntil;
            if (sortOrder !== undefined) reward.sortOrder = sortOrder;

            await reward.save();

            // Fetch with badge data
            const updatedReward = await Reward.findByPk(reward.id, {
                include: [{
                    model: Badge,
                    as: 'badge'
                }]
            });

            res.json({
                success: true,
                message: 'Reward updated successfully',
                data: updatedReward.toJSON()
            });
        } catch (error) {
            console.error('Update reward error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update reward',
                message: error.message
            });
        }
    }

    /**
     * DELETE /api/rewards/:id
     * Delete reward
     */
    async deleteReward(req, res) {
        try {
            const { id } = req.params;

            const reward = await Reward.findByPk(id);

            if (!reward) {
                return res.status(404).json({
                    success: false,
                    error: 'Reward not found'
                });
            }

            await reward.destroy();

            res.json({
                success: true,
                message: 'Reward deleted successfully'
            });
        } catch (error) {
            console.error('Delete reward error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to delete reward',
                message: error.message
            });
        }
    }

    /**
     * POST /api/rewards/check
     * Check and award rewards for user based on current score
     */
    async checkRewardsForUser(req, res) {
        try {
            const { userId, currentScore, userLevel } = req.body;

            if (!userId || currentScore === undefined) {
                return res.status(400).json({
                    success: false,
                    error: 'userId and currentScore are required'
                });
            }

            const result = await RewardService.checkAndAwardRewards(
                userId,
                currentScore,
                userLevel
            );

            res.json({
                success: true,
                message: `Awarded ${result.totalNewRewards} new reward(s)`,
                data: result
            });
        } catch (error) {
            console.error('Check rewards error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to check rewards',
                message: error.message
            });
        }
    }

    /**
     * GET /api/rewards/user/:userId
     * Get all rewards for user
     */
    async getUserRewards(req, res) {
        try {
            const { userId } = req.params;
            const { includeViewed, limit, offset } = req.query;

            const rewards = await RewardService.getUserRewards(userId, {
                includeViewed: includeViewed !== 'false',
                limit: limit ? parseInt(limit) : null,
                offset: offset ? parseInt(offset) : null
            });

            res.json({
                success: true,
                data: rewards,
                count: rewards.length
            });
        } catch (error) {
            console.error('Get user rewards error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch user rewards',
                message: error.message
            });
        }
    }

    /**
     * GET /api/rewards/user/:userId/progress
     * Get user's progress toward all rewards
     */
    async getUserRewardProgress(req, res) {
        try {
            const { userId } = req.params;
            const { currentScore, userLevel } = req.query;

            if (!currentScore) {
                return res.status(400).json({
                    success: false,
                    error: 'currentScore is required'
                });
            }

            const progress = await RewardService.getUserRewardProgress(
                userId,
                parseInt(currentScore),
                userLevel ? parseInt(userLevel) : null
            );

            res.json({
                success: true,
                data: progress
            });
        } catch (error) {
            console.error('Get user reward progress error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch reward progress',
                message: error.message
            });
        }
    }

    /**
     * GET /api/rewards/user/:userId/stats
     * Get reward statistics for user
     */
    async getUserRewardStats(req, res) {
        try {
            const { userId } = req.params;

            const stats = await RewardService.getUserRewardStats(userId);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Get user reward stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch reward stats',
                message: error.message
            });
        }
    }

    /**
     * PATCH /api/rewards/user/:userId/view/:userRewardId
     * Mark reward as viewed
     */
    async markRewardViewed(req, res) {
        try {
            const { userId, userRewardId } = req.params;

            const userReward = await RewardService.markRewardAsViewed(
                parseInt(userRewardId),
                parseInt(userId)
            );

            res.json({
                success: true,
                message: 'Reward marked as viewed',
                data: userReward
            });
        } catch (error) {
            console.error('Mark reward viewed error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to mark reward as viewed',
                message: error.message
            });
        }
    }

    /**
     * PATCH /api/rewards/user/:userId/view-all
     * Mark all rewards as viewed
     */
    async markAllRewardsViewed(req, res) {
        try {
            const { userId } = req.params;

            const count = await RewardService.markAllRewardsAsViewed(parseInt(userId));

            res.json({
                success: true,
                message: `Marked ${count} reward(s) as viewed`,
                count
            });
        } catch (error) {
            console.error('Mark all rewards viewed error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to mark rewards as viewed',
                message: error.message
            });
        }
    }
}

module.exports = new RewardController();