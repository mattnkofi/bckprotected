// services/RewardService.js
const { Reward, UserReward, Badge, User } = require('../model');
const { Op } = require('sequelize');

/**
 * Reward Service - Business logic for reward system
 * 
 * Features:
 * - Check and award rewards based on user score
 * - Manage repeatable rewards with cooldowns
 * - Track reward progress
 * - Handle reward notifications
 */
class RewardService {
    /**
     * Check if user has earned any new rewards based on current score
     * @param {number} userId - User ID
     * @param {number} currentScore - User's current score
     * @param {number} userLevel - User's current level (optional)
     * @returns {Promise<Object>} - New rewards earned
     */
    async checkAndAwardRewards(userId, currentScore, userLevel = null) {
        try {
            // Get all active rewards
            const activeRewards = await Reward.findAll({
                where: {
                    isActive: true,
                    requiredScore: {
                        [Op.lte]: currentScore // Score requirement met
                    }
                },
                include: [{
                    model: Badge,
                    as: 'badge'
                }],
                order: [['requiredScore', 'ASC']]
            });

            const newRewards = [];
            const eligibilityChecks = [];

            // Check eligibility for each reward
            for (const reward of activeRewards) {
                const eligibility = await reward.checkEligibility(userId, currentScore, userLevel);

                if (eligibility.eligible) {
                    // Award the reward
                    const userReward = await this._awardReward(userId, reward.id, currentScore);
                    newRewards.push({
                        userReward,
                        reward: reward.toJSON()
                    });
                } else {
                    eligibilityChecks.push({
                        rewardId: reward.id,
                        rewardName: reward.name,
                        eligible: false,
                        reason: eligibility.reason,
                        progress: eligibility.progress || null
                    });
                }
            }

            return {
                newRewards,
                totalNewRewards: newRewards.length,
                eligibilityChecks
            };
        } catch (error) {
            console.error('Check and award rewards error:', error);
            throw error;
        }
    }

    /**
     * Award a specific reward to user
     * @private
     */
    async _awardReward(userId, rewardId, currentScore) {
        try {
            // Check if already earned
            const existing = await UserReward.findOne({
                where: { userId, rewardId }
            });

            if (existing) {
                // If repeatable, increment count
                const reward = await Reward.findByPk(rewardId);
                if (reward && reward.isRepeatable) {
                    return await existing.incrementEarnCount();
                }
                return existing;
            }

            // Create new user reward
            const userReward = await UserReward.create({
                userId,
                rewardId,
                earnedAt: new Date(),
                scoreAtEarn: currentScore,
                earnedCount: 1,
                lastEarnedAt: new Date(),
                isViewed: false
            });

            return userReward;
        } catch (error) {
            console.error('Award reward error:', error);
            throw error;
        }
    }

    /**
     * Get all rewards earned by user
     * @param {number} userId - User ID
     * @param {Object} options - Query options
     * @returns {Promise<Array>} - User's rewards
     */
    async getUserRewards(userId, options = {}) {
        try {
            const {
                includeViewed = true,
                limit = null,
                offset = null
            } = options;

            const whereClause = { userId };
            if (!includeViewed) {
                whereClause.isViewed = false;
            }

            const queryOptions = {
                where: whereClause,
                include: [{
                    model: Reward,
                    as: 'reward',
                    include: [{
                        model: Badge,
                        as: 'badge'
                    }]
                }],
                order: [['earnedAt', 'DESC']]
            };

            if (limit) queryOptions.limit = limit;
            if (offset) queryOptions.offset = offset;

            const userRewards = await UserReward.findAll(queryOptions);

            return userRewards.map(ur => ur.toJSON());
        } catch (error) {
            console.error('Get user rewards error:', error);
            throw error;
        }
    }

    /**
     * Get unviewed rewards count for user
     * @param {number} userId - User ID
     * @returns {Promise<number>} - Count of unviewed rewards
     */
    async getUnviewedRewardsCount(userId) {
        try {
            return await UserReward.count({
                where: {
                    userId,
                    isViewed: false
                }
            });
        } catch (error) {
            console.error('Get unviewed rewards count error:', error);
            throw error;
        }
    }

    /**
     * Mark reward as viewed
     * @param {number} userRewardId - UserReward ID
     * @param {number} userId - User ID (for verification)
     * @returns {Promise<Object>} - Updated user reward
     */
    async markRewardAsViewed(userRewardId, userId) {
        try {
            const userReward = await UserReward.findOne({
                where: {
                    id: userRewardId,
                    userId
                }
            });

            if (!userReward) {
                throw new Error('Reward not found or does not belong to user');
            }

            return await userReward.markAsViewed();
        } catch (error) {
            console.error('Mark reward as viewed error:', error);
            throw error;
        }
    }

    /**
     * Mark all rewards as viewed for user
     * @param {number} userId - User ID
     * @returns {Promise<number>} - Number of rewards marked
     */
    async markAllRewardsAsViewed(userId) {
        try {
            const [updatedCount] = await UserReward.update(
                {
                    isViewed: true,
                    viewedAt: new Date()
                },
                {
                    where: {
                        userId,
                        isViewed: false
                    }
                }
            );

            return updatedCount;
        } catch (error) {
            console.error('Mark all rewards as viewed error:', error);
            throw error;
        }
    }

    /**
     * Get user's reward progress for available rewards
     * @param {number} userId - User ID
     * @param {number} currentScore - User's current score
     * @param {number} userLevel - User's current level (optional)
     * @returns {Promise<Array>} - Progress for each reward
     */
    async getUserRewardProgress(userId, currentScore, userLevel = null) {
        try {
            const activeRewards = await Reward.findAll({
                where: { isActive: true },
                include: [{
                    model: Badge,
                    as: 'badge'
                }],
                order: [['requiredScore', 'ASC']]
            });

            const progress = [];

            for (const reward of activeRewards) {
                const eligibility = await reward.checkEligibility(userId, currentScore, userLevel);

                const userReward = await UserReward.findOne({
                    where: { userId, rewardId: reward.id }
                });

                progress.push({
                    reward: reward.toJSON(),
                    earned: !!userReward,
                    earnedCount: userReward ? userReward.earnedCount : 0,
                    earnedAt: userReward ? userReward.earnedAt : null,
                    eligible: eligibility.eligible,
                    reason: eligibility.reason,
                    progress: eligibility.progress || this._calculateProgress(currentScore, reward.requiredScore),
                    scoreNeeded: Math.max(0, reward.requiredScore - currentScore)
                });
            }

            return progress;
        } catch (error) {
            console.error('Get user reward progress error:', error);
            throw error;
        }
    }

    /**
     * Get reward statistics for user
     * @param {number} userId - User ID
     * @returns {Promise<Object>} - Reward statistics
     */
    async getUserRewardStats(userId) {
        try {
            const totalRewards = await UserReward.count({
                where: { userId }
            });

            const unviewedRewards = await UserReward.count({
                where: {
                    userId,
                    isViewed: false
                }
            });

            const rewardsByType = await UserReward.findAll({
                where: { userId },
                include: [{
                    model: Reward,
                    as: 'reward',
                    attributes: ['rewardType']
                }],
                attributes: [],
                group: ['reward.rewardType'],
                raw: true
            });

            const recentRewards = await this.getUserRewards(userId, {
                limit: 5,
                includeViewed: true
            });

            return {
                totalRewards,
                unviewedRewards,
                rewardsByType,
                recentRewards
            };
        } catch (error) {
            console.error('Get user reward stats error:', error);
            throw error;
        }
    }

    /**
     * Calculate progress percentage
     * @private
     */
    _calculateProgress(currentScore, requiredScore) {
        if (requiredScore === 0) return 100;
        return Math.min(100, Math.round((currentScore / requiredScore) * 100));
    }
}

module.exports = new RewardService();