'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('UserRewards', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      rewardId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Rewards',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      earnedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When the user earned this reward'
      },
      scoreAtEarn: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'User score when reward was earned'
      },
      earnedCount: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
        comment: 'Number of times earned (for repeatable rewards)'
      },
      lastEarnedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Last time earned (for repeatable rewards)'
      },
      isViewed: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false,
        comment: 'Whether user has viewed the reward notification'
      },
      viewedAt: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When user viewed the reward'
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
    await queryInterface.addIndex('UserRewards', ['userId']);
    await queryInterface.addIndex('UserRewards', ['rewardId']);
    await queryInterface.addIndex('UserRewards', ['earnedAt']);
    await queryInterface.addIndex('UserRewards', ['isViewed']);

    // Unique constraint for non-repeatable rewards
    await queryInterface.addIndex('UserRewards', ['userId', 'rewardId'], {
      name: 'unique_user_reward',
      unique: false // Can be earned multiple times for repeatable rewards
    });
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('UserRewards');
  }
};