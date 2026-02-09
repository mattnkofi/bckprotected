'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Badge extends Model {
    static associate(models) {
      // A badge can be used in multiple rewards
      Badge.hasMany(models.Reward, {
        foreignKey: 'badgeId',
        as: 'rewards'
      });
    }

    /**
     * Get the full icon URL
     */
    getIconUrl() {
      if (!this.iconKey) return null;
      const baseUrl = process.env.R2_PUBLIC_URL || process.env.WORKER_URL;
      return `${baseUrl}/${this.iconKey}`;
    }

    /**
     * Serialize for JSON response
     */
    toJSON() {
      const values = { ...this.get() };
      values.iconUrl = this.getIconUrl();
      return values;
    }
  }

  Badge.init(
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
            msg: 'Badge name is required'
          },
          len: {
            args: [1, 100],
            msg: 'Badge name must be between 1 and 100 characters'
          }
        }
      },
      description: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      iconKey: {
        type: DataTypes.STRING(255),
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Icon key is required'
          }
        }
      },
      category: {
        type: DataTypes.ENUM('achievement', 'milestone', 'special', 'seasonal', 'quiz', 'learning'),
        defaultValue: 'achievement',
        allowNull: false
      },
      rarity: {
        type: DataTypes.ENUM('common', 'uncommon', 'rare', 'epic', 'legendary'),
        defaultValue: 'common',
        allowNull: false
      },
      isActive: {
        type: DataTypes.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      sortOrder: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'Badge',
      tableName: 'Badges',
      timestamps: true,
      underscored: false
    }
  );

  return Badge;
};