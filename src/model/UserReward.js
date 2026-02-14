module.exports = (sequelize, DataTypes) => {
    const UserReward = sequelize.define('UserReward', {
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
    }, {
        timestamps: true,
        underscored: false,
        tableName: 'UserRewards'
    });

    // Associations
    UserReward.associate = function (models) {
        UserReward.belongsTo(models.User, {
            foreignKey: 'userId',
            as: 'user'
        });

        UserReward.belongsTo(models.Reward, {
            foreignKey: 'rewardId',
            as: 'reward'
        });
    };

    // Instance methods
    UserReward.prototype.markAsViewed = async function () {
        this.isViewed = true;
        this.viewedAt = new Date();
        await this.save();
        return this;
    };

    UserReward.prototype.incrementEarnCount = async function () {
        this.earnedCount += 1;
        this.lastEarnedAt = new Date();
        await this.save();
        return this;
    };

    UserReward.prototype.toJSON = function () {
        const values = { ...this.get() };
        if (this.reward) values.reward = this.reward.toJSON();
        return values;
    };

    return UserReward;
};
