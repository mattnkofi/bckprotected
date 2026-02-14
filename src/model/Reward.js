// models/Reward.js
module.exports = (sequelize, DataTypes) => {
    const Reward = sequelize.define('Reward', {
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
        image_url: {
            type: DataTypes.STRING(500),
            allowNull: true
        },
        points_required: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: {
                min: {
                    args: [0],
                    msg: 'Points required cannot be negative'
                }
            }
        },
        stock_quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            validate: {
                min: {
                    args: [0],
                    msg: 'Stock quantity cannot be negative'
                }
            }
        },
        is_active: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
            allowNull: false
        },
        category: {
            type: DataTypes.STRING(50),
            allowNull: true
        }
    }, {
        timestamps: true,
        underscored: true,
        tableName: 'Rewards'
    });

    // Associations
    Reward.associate = function (models) {
        Reward.hasMany(models.UserRedemption, {
            foreignKey: 'reward_id',
            as: 'redemptions'
        });
    };

    // Instance methods
    Reward.prototype.isAvailable = function () {
        return this.is_active && this.stock_quantity > 0;
    };

    Reward.prototype.canRedeem = function (userScore, quantity = 1) {
        if (!this.isAvailable()) {
            return {
                canRedeem: false,
                reason: 'Reward is not available'
            };
        }

        if (this.stock_quantity < quantity) {
            return {
                canRedeem: false,
                reason: `Only ${this.stock_quantity} items left in stock`
            };
        }

        const totalPointsNeeded = this.points_required * quantity;
        if (userScore < totalPointsNeeded) {
            return {
                canRedeem: false,
                reason: `Need ${totalPointsNeeded} points (you have ${userScore})`,
                pointsNeeded: totalPointsNeeded - userScore
            };
        }

        return { canRedeem: true };
    };

    Reward.prototype.reduceStock = async function (quantity = 1) {
        if (this.stock_quantity < quantity) {
            throw new Error('Insufficient stock');
        }
        this.stock_quantity -= quantity;
        await this.save();
        return this;
    };

    Reward.prototype.restoreStock = async function (quantity = 1) {
        this.stock_quantity += quantity;
        await this.save();
        return this;
    };

    return Reward;
};