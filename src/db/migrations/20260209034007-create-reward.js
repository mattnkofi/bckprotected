'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Rewards', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      name: {
        type: Sequelize.STRING(100),
        allowNull: false,
        comment: 'Display name of the reward'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'What this reward unlocks or provides'
      },
      badgeId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Badges',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'Optional badge associated with this reward'
      },
      rewardType: {
        type: Sequelize.ENUM('badge', 'points', 'unlock', 'title', 'combo'),
        allowNull: false,
        defaultValue: 'badge',
        comment: 'Type of reward'
      },
      pointsValue: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Points awarded if rewardType includes points'
      },
      unlockContent: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'JSON data for unlockable content (e.g., {moduleId: 5, lessonId: 10})'
      },
      titleText: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'Title/achievement text if rewardType is title'
      },
      requiredScore: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Minimum score required to earn this reward'
      },
      requiredLevel: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Optional level requirement'
      },
      isRepeatable: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Can be earned multiple times'
      },
      cooldownDays: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Days before can be earned again (for repeatable rewards)'
      },
      isActive: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      validFrom: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Start date for seasonal/limited rewards'
      },
      validUntil: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'End date for seasonal/limited rewards'
      },
      sortOrder: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
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
    await queryInterface.addIndex('Rewards', ['badgeId']);
    await queryInterface.addIndex('Rewards', ['requiredScore']);
    await queryInterface.addIndex('Rewards', ['isActive']);
    await queryInterface.addIndex('Rewards', ['rewardType']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Rewards');
  }
};