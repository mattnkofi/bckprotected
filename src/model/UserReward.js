'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
    class UserReward extends Model {
        static associate(models) {
            // UserReward belongs to User
            UserReward.belongsTo(models.User, {
                foreignKey: 'userId',
                as: 'user'
            });

            // UserReward belongs to Reward
            UserReward.belongsTo(models.Reward, {
                foreignKey: 'rewardId',
                as: 'reward'
            });
        }

        /**
         * Mark as viewed by user
         */
        async markAsViewed() {
            this.isViewed = true;
            this.viewedAt = new Date();
            await this.save();
            return this;
        }

        /**
         * Increment earned count for repeatable rewards
         */
        async incrementEarnCount() {
            this.earnedCount += 1;
            this.lastEarnedAt = new Date();
            await this.save();
            return this;
        }

        /**
         * Serialize for JSON response
         */
        toJSON() {
            const values = { ...this.get() };

            // Include reward and badge data if loaded
            if (this.reward) {
                values.reward = this.reward.toJSON();
            }

            return values;
        }
    }

    UserReward.init(
        {
            id: {
                type: DataTypes.INTEGER,
                primaryKey: true,
                autoIncrement: true
            },
            userId: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            rewardId: {
                type: DataTypes.INTEGER,
                allowNull: false
            },
            earnedAt: {
                type: DataTypes.DATE,
                allowNull: false,
                defaultValue: DataTypes.NOW
            },
            scoreAtEarn: {
                type: DataTypes.INTEGER,
                allowNull: true
            },
            earnedCount: {
                type: DataTypes.INTEGER,
                defaultValue: 1,
                allowNull: false
            },
            lastEarnedAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            isViewed: {
                type: DataTypes.BOOLEAN,
                defaultValue: false,
                allowNull: false
            },
            viewedAt: {
                type: DataTypes.DATE,
                allowNull: true
            }
        },
        {
            sequelize,
            modelName: 'UserReward',
            tableName: 'UserRewards',
            timestamps: true,
            underscored: false
        }
    );

    return UserReward;
};