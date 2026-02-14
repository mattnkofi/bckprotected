// controllers/RewardController.js
const { Reward, UserRedemption, User } = require('../model');
const RewardService = require('../services/RewardService');
const { Op } = require('sequelize');

class RewardController {
    /**
     * Get all rewards (with optional filters)
     * GET /api/v1/rewards
     */
    async getAllRewards(req, res) {
        try {
            const { category, is_active, min_points, max_points } = req.query;

            const whereClause = {};

            if (category) whereClause.category = category;
            if (is_active !== undefined) whereClause.is_active = is_active === 'true';

            if (min_points || max_points) {
                whereClause.points_required = {};
                if (min_points) whereClause.points_required[Op.gte] = parseInt(min_points);
                if (max_points) whereClause.points_required[Op.lte] = parseInt(max_points);
            }

            const rewards = await Reward.findAll({
                where: whereClause,
                order: [['points_required', 'ASC']]
            });

            res.json({
                success: true,
                data: rewards
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
     * Get available rewards for user (with redemption ability check)
     * GET /api/v1/rewards/available
     */
    async getAvailableRewards(req, res) {
        try {
            const userId = req.user.id; // From auth middleware

            const rewards = await RewardService.getAvailableRewards(userId);

            res.json({
                success: true,
                data: rewards
            });
        } catch (error) {
            console.error('Get available rewards error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch available rewards',
                message: error.message
            });
        }
    }

    /**
     * Get single reward by ID
     * GET /api/v1/rewards/:id
     */
    async getRewardById(req, res) {
        try {
            const { id } = req.params;

            const reward = await Reward.findByPk(id);

            if (!reward) {
                return res.status(404).json({
                    success: false,
                    error: 'Reward not found'
                });
            }

            res.json({
                success: true,
                data: reward
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
     * Create new reward (Admin/Facilitator only)
     * POST /api/v1/rewards
     */
    async createReward(req, res) {
        try {
            const {
                name,
                description,
                image_url,
                points_required,
                stock_quantity,
                category,
                is_active = true
            } = req.body;

            // Validation
            if (!name || !points_required || stock_quantity === undefined) {
                return res.status(400).json({
                    success: false,
                    error: 'Missing required fields: name, points_required, stock_quantity'
                });
            }

            const reward = await Reward.create({
                name,
                description,
                image_url,
                points_required: parseInt(points_required),
                stock_quantity: parseInt(stock_quantity),
                category,
                is_active
            });

            res.status(201).json({
                success: true,
                message: 'Reward created successfully',
                data: reward
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
     * Update reward (Admin/Facilitator only)
     * PUT /api/v1/rewards/:id
     */
    async updateReward(req, res) {
        try {
            const { id } = req.params;
            const updates = req.body;

            const reward = await Reward.findByPk(id);

            if (!reward) {
                return res.status(404).json({
                    success: false,
                    error: 'Reward not found'
                });
            }

            // Update fields
            const allowedFields = [
                'name',
                'description',
                'image_url',
                'points_required',
                'stock_quantity',
                'category',
                'is_active'
            ];

            allowedFields.forEach(field => {
                if (updates[field] !== undefined) {
                    reward[field] = updates[field];
                }
            });

            await reward.save();

            res.json({
                success: true,
                message: 'Reward updated successfully',
                data: reward
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
     * Delete reward (Admin only)
     * DELETE /api/v1/rewards/:id
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

            // Check if there are pending redemptions
            const pendingRedemptions = await UserRedemption.count({
                where: {
                    reward_id: id,
                    status: 'pending'
                }
            });

            if (pendingRedemptions > 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Cannot delete reward with pending redemptions',
                    pendingCount: pendingRedemptions
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
     * Redeem a reward
     * POST /api/v1/rewards/:id/redeem
     */
    async redeemReward(req, res) {
        try {
            const userId = req.user.id;
            const { id: rewardId } = req.params;
            const { quantity = 1, notes } = req.body;

            const result = await RewardService.redeemReward(
                userId,
                parseInt(rewardId),
                parseInt(quantity),
                notes
            );

            res.json({
                success: true,
                message: 'Reward redeemed successfully',
                data: result
            });
        } catch (error) {
            console.error('Redeem reward error:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to redeem reward',
                message: error.message
            });
        }
    }

    /**
     * Get user's redemption history
     * GET /api/v1/rewards/my-redemptions
     */
    async getMyRedemptions(req, res) {
        try {
            const userId = req.user.id;
            const { status, limit, offset } = req.query;

            const redemptions = await RewardService.getUserRedemptions(userId, {
                status,
                limit: limit ? parseInt(limit) : 20,
                offset: offset ? parseInt(offset) : 0
            });

            res.json({
                success: true,
                data: redemptions
            });
        } catch (error) {
            console.error('Get my redemptions error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch redemptions',
                message: error.message
            });
        }
    }

    /**
     * Get user stats
     * GET /api/v1/rewards/my-stats
     */
    async getMyStats(req, res) {
        try {
            const userId = req.user.id;

            const stats = await RewardService.getUserStats(userId);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Get user stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch stats',
                message: error.message
            });
        }
    }

    /**
     * Cancel redemption
     * POST /api/v1/rewards/redemptions/:id/cancel
     */
    async cancelRedemption(req, res) {
        try {
            const userId = req.user.id;
            const { id: redemptionId } = req.params;

            const result = await RewardService.cancelRedemption(
                parseInt(redemptionId),
                userId,
                false
            );

            res.json({
                success: true,
                message: 'Redemption cancelled and points refunded',
                data: result
            });
        } catch (error) {
            console.error('Cancel redemption error:', error);
            res.status(400).json({
                success: false,
                error: 'Failed to cancel redemption',
                message: error.message
            });
        }
    }

    /**
     * Get all redemptions (Admin only)
     * GET /api/v1/rewards/admin/redemptions
     */
    async getAllRedemptions(req, res) {
        try {
            const { status, limit, offset } = req.query;

            const whereClause = {};
            if (status) whereClause.status = status;

            const redemptions = await UserRedemption.findAll({
                where: whereClause,
                include: [
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email']
                    },
                    {
                        model: Reward,
                        as: 'reward'
                    }
                ],
                order: [['redeemed_at', 'DESC']],
                limit: limit ? parseInt(limit) : 50,
                offset: offset ? parseInt(offset) : 0
            });

            res.json({
                success: true,
                data: redemptions
            });
        } catch (error) {
            console.error('Get all redemptions error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch redemptions',
                message: error.message
            });
        }
    }

    /**
     * Update redemption status (Admin only)
     * PATCH /api/v1/rewards/admin/redemptions/:id
     */
    async updateRedemptionStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, admin_notes } = req.body;

            const redemption = await UserRedemption.findByPk(id, {
                include: [
                    { model: User, as: 'user', attributes: ['id', 'name', 'email'] },
                    { model: Reward, as: 'reward' }
                ]
            });

            if (!redemption) {
                return res.status(404).json({
                    success: false,
                    error: 'Redemption not found'
                });
            }

            if (status) {
                if (!['pending', 'approved', 'completed', 'cancelled'].includes(status)) {
                    return res.status(400).json({
                        success: false,
                        error: 'Invalid status'
                    });
                }
                redemption.status = status;

                if (status === 'completed') {
                    redemption.fulfilled_at = new Date();
                }
            }

            if (admin_notes !== undefined) {
                redemption.admin_notes = admin_notes;
            }

            await redemption.save();

            res.json({
                success: true,
                message: 'Redemption updated successfully',
                data: redemption
            });
        } catch (error) {
            console.error('Update redemption status error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update redemption',
                message: error.message
            });
        }
    }
}

module.exports = new RewardController();