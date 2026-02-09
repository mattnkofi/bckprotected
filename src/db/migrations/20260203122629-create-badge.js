'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Badges', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Display name of the badge'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description of what this badge represents'
      },
      iconKey: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'R2 storage key for the badge icon (e.g., badges/123/icon.png)'
      },
      iconUrl: {
        type: Sequelize.VIRTUAL,
        get() {
          // This will be constructed dynamically
          const key = this.getDataValue('iconKey');
          return key ? `${process.env.R2_PUBLIC_URL}/${key}` : null;
        }
      },
      category: {
        type: Sequelize.ENUM('achievement', 'milestone', 'special', 'seasonal', 'quiz', 'learning'),
        defaultValue: 'achievement',
        allowNull: false,
        comment: 'Category of badge for organization'
      },
      rarity: {
        type: Sequelize.ENUM('common', 'uncommon', 'rare', 'epic', 'legendary'),
        defaultValue: 'common',
        allowNull: false,
        comment: 'Rarity level affects display style'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether this badge can be awarded'
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false,
        comment: 'Display order in lists'
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Indexes
    await queryInterface.addIndex('Badges', ['category']);
    await queryInterface.addIndex('Badges', ['rarity']);
    await queryInterface.addIndex('Badges', ['isActive']);
    await queryInterface.addIndex('Badges', ['sortOrder']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Badges');
  }
};