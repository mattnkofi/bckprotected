module.exports = (sequelize, DataTypes) => {
  const Badge = sequelize.define('Badge', {
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
  }, {
    timestamps: true,
    underscored: false,
    tableName: 'Badges'
  });

  // // Associations
  // Badge.associate = function (models) {
  //   Badge.hasMany(models.Reward, {
  //     foreignKey: 'badgeId',
  //     as: 'rewards'
  //   });
  // };

  // // Instance methods
  // Badge.prototype.getIconUrl = function () {
  //   if (!this.iconKey) return null;
  //   const baseUrl = process.env.R2_PUBLIC_URL || process.env.WORKER_URL;
  //   return `${baseUrl}/${this.iconKey}`;
  // };

  // Badge.prototype.toJSON = function () {
  //   const values = { ...this.get() };
  //   values.iconUrl = this.getIconUrl();
  //   return values;
  // };

  return Badge;
};
