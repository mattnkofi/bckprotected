'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class Reward extends Model {
        static associate(models) {
            // A reward belongs to a badge (optional)
            Reward.belongsTo(models.Badge, {
                foreignKey: 'badgeId',
                as: 'badge'
            });

            // A reward can be earned by many users
            Reward.belongsToMany(models.User, {
                through: models.UserReward,
                foreignKey: 'rewardId',
                otherKey: 'userId',
                as: 'users'
            });

            // Direct access to UserReward records
            Reward.hasMany(models.UserReward, {
                foreignKey: 'rewardId',
                as: 'userRewards'
            });
        }

        /**
         * Check if reward is currently valid (for time-limited rewards)
         */
        isCurrentlyValid() {
            const now = new Date();

            if (this.validFrom && now < this.validFrom) {
                return false;
            }

            if (this.validUntil && now > this.validUntil) {
                return false;
            }

            return this.isActive;
        }

        /**
         * Check if user meets requirements for this reward
         */
        async checkEligibility(userId, userScore, userLevel = null) {
            // Check if active and time-valid
            if (!this.isCurrentlyValid()) {
                return {
                    eligible: false,
                    reason: 'Reward is not currently available'
                };
            }

            // Check score requirement
            if (userScore < this.requiredScore) {
                return {
                    eligible: false,
                    reason: `Requires ${this.requiredScore} points (you have ${userScore})`,
                    progress: (userScore / this.requiredScore) * 100
                };
            }

            // Check level requirement
            if (this.requiredLevel && userLevel && userLevel < this.requiredLevel) {
                return {
                    eligible: false,
                    reason: `Requires level ${this.requiredLevel}`
                };
            }

            // Check if already earned (for non-repeatable rewards)
            if (!this.isRepeatable) {
                const UserReward = sequelize.models.UserReward;
                const existing = await UserReward.findOne({
                    where: {
                        userId: userId,
                        rewardId: this.id
                    }
                });

                if (existing) {
                    return {
                        eligible: false,
                        reason: 'Already earned'
                    };
                }
            } else if (this.cooldownDays) {
                // Check cooldown for repeatable rewards
                const UserReward = sequelize.models.UserReward;
                const lastEarned = await UserReward.findOne({
                    where: {
                        userId: userId,
                        rewardId: this.id
                    },
                    order: [['lastEarnedAt', 'DESC']]
                });

                if (lastEarned && lastEarned.lastEarnedAt) {
                    const daysSinceEarned = Math.floor(
                        (Date.now() - lastEarned.lastEarnedAt.getTime()) / (1000 * 60 * 60 * 24)
                    );

                    if (daysSinceEarned < this.cooldownDays) {
                        const daysRemaining = this.cooldownDays - daysSinceEarned;
                        return {
                            eligible: false,
                            reason: `Available again in ${daysRemaining} days`
                        };
                    }
                }
            }

            return {
                eligible: true,
                reason: 'All requirements met'
            };
        }

        /**
         * Serialize for JSON response
         */
        toJSON() {
            const values = { ...this.get() };

            // Include badge data if loaded
            if (this.badge) {
                values.badge = this.badge.toJSON();
            }

            return values;
        }
    }

    Reward.init(
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            name: {
                type: DataTypes.STRING(100),
                allowNull: false,
                validate: {
                    notEmpty: {
                        msg: 'Reward name is required'
                    }
                }
            },
            description: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            badgeId: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            rewardType: {
                type: DataTypes.ENUM('badge', 'points', 'unlock', 'title', 'combo'),
                allowNull: false,
                defaultValue: 'badge'
            },
            pointsValue: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            unlockContent: {
                type: DataTypes.JSON,
                allowNull: true
            },
            titleText: {
                type: DataTypes.STRING(100),
                allowNull: true
            },
            requiredScore: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
                validate: {
                    min: {
                        args: [0],
                        msg: 'Required score cannot be negative'
                    }
                }
            },
            requiredLevel: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            isRepeatable: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false
            },
            cooldownDays: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            isActive: {
                type: DataTypes.BOOLEAN,
                defaultValue: true,
                allowNull: false
            },
            validFrom: {
                type: DataTypes.DATE,
                allowNull: true
            },
            validUntil: {
                type: DataTypes.DATE,
                allowNull: true
            },
            sortOrder: {
                type: DataTypes.INTEGER,
                defaultValue: 0,
                allowNull: false
            }
        },
        {
            sequelize,
            modelName: 'Reward',
            tableName: 'Rewards',
            timestamps: true,
            underscored: false
        }
    );

    return Reward;
};