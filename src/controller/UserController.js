// controllers/UserController.js
const { User } = require('../model');

class UserController {
    /**
     * Update User Score (called when user completes activities)
     * POST /api/v1/users/update-score
     */
    async updateScore(req, res) {
        try {
            const userId = req.user.id;
            const { points } = req.body;

            if (!points || typeof points !== 'number' || points < 0) {
                return res.status(400).json({
                    success: false,
                    error: 'Valid points value required'
                });
            }

            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const oldScore = user.score || 0;
            const oldLevel = user.level || 1;
            const newScore = oldScore + points;

            // Simple level progression: level up every 1000 points
            const newLevel = Math.floor(newScore / 1000) + 1;
            const leveledUp = newLevel > oldLevel;

            user.score = newScore;
            user.level = newLevel;
            await user.save();

            res.json({
                success: true,
                message: 'Score updated successfully',
                data: {
                    oldScore,
                    newScore,
                    pointsAdded: points,
                    oldLevel,
                    newLevel,
                    leveledUp
                }
            });
        } catch (error) {
            console.error('Update score error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to update score',
                message: error.message
            });
        }
    }

    /**
     * Get User Stats
     * GET /api/v1/users/stats
     */
    async getUserStats(req, res) {
        try {
            const userId = req.user.id;

            const user = await User.findByPk(userId, {
                attributes: ['id', 'name', 'email', 'score', 'level', 'experience_points']
            });

            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            res.json({
                success: true,
                data: user
            });
        } catch (error) {
            console.error('Get user stats error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to fetch user stats',
                message: error.message
            });
        }
    }

    /**
     * Award Points (Admin/Facilitator only)
     * POST /api/v1/users/:userId/award-points
     */
    async awardPoints(req, res) {
        try {
            const { userId } = req.params;
            const { points, reason } = req.body;

            if (!points || typeof points !== 'number') {
                return res.status(400).json({
                    success: false,
                    error: 'Valid points value required'
                });
            }

            const user = await User.findByPk(userId);
            if (!user) {
                return res.status(404).json({
                    success: false,
                    error: 'User not found'
                });
            }

            const oldScore = user.score || 0;
            const newScore = oldScore + points;
            const newLevel = Math.floor(newScore / 1000) + 1;

            user.score = newScore;
            user.level = newLevel;
            await user.save();

            console.log(
                `[ADMIN ACTION] ${req.user.email} awarded ${points} points to user ${userId}. Reason: ${reason || 'N/A'}`
            );

            res.json({
                success: true,
                message: `Awarded ${points} points to ${user.name}`,
                data: {
                    oldScore,
                    newScore,
                    newLevel
                }
            });
        } catch (error) {
            console.error('Award points error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to award points',
                message: error.message
            });
        }
    }
}

module.exports = new UserController();