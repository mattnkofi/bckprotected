// models/UserRedemption.js
module.exports = (sequelize, DataTypes) => {
    const UserRedemption = sequelize.define('UserRedemption', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        reward_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        points_spent: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        status: {
            type: DataTypes.ENUM('pending', 'approved', 'completed', 'cancelled'),
            defaultValue: 'pending',
            allowNull: false
        },
        quantity: {
            type: DataTypes.INTEGER,
            defaultValue: 1,
            allowNull: false
        },
        notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        admin_notes: {
            type: DataTypes.TEXT,
            allowNull: true
        },
        redeemed_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        fulfilled_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        timestamps: true,
        underscored: true,
        tableName: 'UserRedemptions'
    });

    // Associations
    UserRedemption.associate = function (models) {
        UserRedemption.belongsTo(models.User, {
            foreignKey: 'user_id',
            as: 'user'
        });

        UserRedemption.belongsTo(models.Reward, {
            foreignKey: 'reward_id',
            as: 'reward'
        });
    };

    // Instance methods
    UserRedemption.prototype.approve = async function () {
        this.status = 'approved';
        await this.save();
        return this;
    };

    UserRedemption.prototype.complete = async function () {
        this.status = 'completed';
        this.fulfilled_at = new Date();
        await this.save();
        return this;
    };

    UserRedemption.prototype.cancel = async function () {
        this.status = 'cancelled';
        await this.save();
        return this;
    };

    return UserRedemption;
};