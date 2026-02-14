// services/RewardService.js
const { Reward, UserRedemption, User } = require('../model');
const { Op } = require('sequelize');
const sequelize = require('../model').sequelize;

class RewardService {
    /**
     * Redeem a reward for a user
     * @param {number} userId - User ID
     * @param {number} rewardId - Reward ID
     * @param {number} quantity - Quantity to redeem
     * @param {string} notes - Optional user notes
     * @returns {Promise<Object>} - Redemption result
     */
    async redeemReward(userId, rewardId, quantity = 1, notes = null) {
        const transaction = await sequelize.transaction();

        try {
            // Get user with lock
            const user = await User.findByPk(userId, {
                lock: transaction.LOCK.UPDATE,
                transaction
            });

            if (!user) {
                throw new Error('User not found');
            }

            // Get reward with lock
            const reward = await Reward.findByPk(rewardId, {
                lock: transaction.LOCK.UPDATE,
                transaction
            });

            if (!reward) {
                throw new Error('Reward not found');
            }

            // Check if reward can be redeemed
            const checkResult = reward.canRedeem(user.score, quantity);
            if (!checkResult.canRedeem) {
                throw new Error(checkResult.reason);
            }

            const totalPoints = reward.points_required * quantity;

            // Deduct points from user
            user.score -= totalPoints;
            await user.save({ transaction });

            // Reduce stock
            reward.stock_quantity -= quantity;
            await reward.save({ transaction });

            // Create redemption record
            const redemption = await UserRedemption.create({
                user_id: userId,
                reward_id: rewardId,
                points_spent: totalPoints,
                quantity,
                notes,
                status: 'pending',
                redeemed_at: new Date()
            }, { transaction });

            await transaction.commit();

            // Return with full details
            const fullRedemption = await UserRedemption.findByPk(redemption.id, {
                include: [
                    {
                        model: Reward,
                        as: 'reward'
                    },
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email', 'score']
                    }
                ]
            });

            return {
                success: true,
                redemption: fullRedemption,
                newScore: user.score,
                pointsSpent: totalPoints
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Cancel a redemption and refund points
     * @param {number} redemptionId - Redemption ID
     * @param {number} userId - User ID (for verification)
     * @returns {Promise<Object>} - Cancellation result
     */
    async cancelRedemption(redemptionId, userId = null, isAdmin = false) {
        const transaction = await sequelize.transaction();

        try {
            const redemption = await UserRedemption.findByPk(redemptionId, {
                include: [
                    { model: Reward, as: 'reward' },
                    { model: User, as: 'user' }
                ],
                lock: transaction.LOCK.UPDATE,
                transaction
            });

            if (!redemption) {
                throw new Error('Redemption not found');
            }

            // Check ownership unless admin
            if (!isAdmin && redemption.user_id !== userId) {
                throw new Error('Unauthorized');
            }

            // Can only cancel pending redemptions
            if (redemption.status !== 'pending') {
                throw new Error(`Cannot cancel ${redemption.status} redemption`);
            }

            // Refund points
            const user = await User.findByPk(redemption.user_id, {
                lock: transaction.LOCK.UPDATE,
                transaction
            });

            user.score += redemption.points_spent;
            await user.save({ transaction });

            // Restore stock
            const reward = await Reward.findByPk(redemption.reward_id, {
                lock: transaction.LOCK.UPDATE,
                transaction
            });

            reward.stock_quantity += redemption.quantity;
            await reward.save({ transaction });

            // Update redemption status
            redemption.status = 'cancelled';
            await redemption.save({ transaction });

            await transaction.commit();

            return {
                success: true,
                redemption,
                refundedPoints: redemption.points_spent,
                newScore: user.score
            };
        } catch (error) {
            await transaction.rollback();
            throw error;
        }
    }

    /**
     * Get available rewards for user
     * @param {number} userId - User ID
     * @returns {Promise<Array>} - Available rewards with user's ability to redeem
     */
    async getAvailableRewards(userId) {
        try {
            const user = await User.findByPk(userId, {
                attributes: ['id', 'score']
            });

            if (!user) {
                throw new Error('User not found');
            }

            const rewards = await Reward.findAll({
                where: {
                    is_active: true,
                    stock_quantity: {
                        [Op.gt]: 0
                    }
                },
                order: [['points_required', 'ASC']]
            });

            return rewards.map(reward => {
                const checkResult = reward.canRedeem(user.score, 1);
                return {
                    ...reward.toJSON(),
                    canRedeem: checkResult.canRedeem,
                    reason: checkResult.reason || null,
                    pointsNeeded: checkResult.pointsNeeded || 0,
                    userScore: user.score
                };
            });
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get user's redemption history
     * @param {number} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - User's redemptions
     */
    async getUserRedemptions(userId, options = {}) {
        try {
            const {
                status = null,
                limit = 20,
                offset = 0
            } = options;

            const whereClause = { user_id: userId };
            if (status) {
                whereClause.status = status;
            }

            const redemptions = await UserRedemption.findAll({
                where: whereClause,
                include: [{
                    model: Reward,
                    as: 'reward'
                }],
                order: [['redeemed_at', 'DESC']],
                limit,
                offset
            });

            return redemptions;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get redemption statistics for user
     * @param {number} userId - User ID
     * @returns {Promise<Object>} - User statistics
     */
    async getUserStats(userId) {
        try {
            const user = await User.findByPk(userId, {
                attributes: ['id', 'name', 'score', 'level']
            });

            if (!user) {
                throw new Error('User not found');
            }

            const totalRedemptions = await UserRedemption.count({
                where: { user_id: userId }
            });

            const totalPointsSpent = await UserRedemption.sum('points_spent', {
                where: { user_id: userId }
            }) || 0;

            const pendingRedemptions = await UserRedemption.count({
                where: {
                    user_id: userId,
                    status: 'pending'
                }
            });

            return {
                user: user.toJSON(),
                totalRedemptions,
                totalPointsSpent,
                pendingRedemptions,
                currentScore: user.score
            };
        } catch (error) {
            throw error;
        }
    }
}

module.exports = new RewardService();