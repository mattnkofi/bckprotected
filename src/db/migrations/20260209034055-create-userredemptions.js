'use strict';

/**
 * Migration: Create UserRedemptions Table
 * 
 * Tracks when users redeem rewards with their points
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('UserRedemptions', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false
      },
      user_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      reward_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Rewards',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      points_spent: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Points deducted from user score'
      },
      status: {
        type: Sequelize.ENUM('pending', 'approved', 'completed', 'cancelled'),
        defaultValue: 'pending',
        allowNull: false,
        comment: 'Redemption status'
      },
      quantity: {
        type: Sequelize.INTEGER,
        defaultValue: 1,
        allowNull: false,
        comment: 'Number of items redeemed'
      },
      notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'User notes or delivery instructions'
      },
      admin_notes: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Admin notes about fulfillment'
      },
      redeemed_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
        comment: 'When user redeemed the reward'
      },
      fulfilled_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the reward was delivered/completed'
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });

    // Indexes
    await queryInterface.addIndex('UserRedemptions', ['user_id']);
    await queryInterface.addIndex('UserRedemptions', ['reward_id']);
    await queryInterface.addIndex('UserRedemptions', ['status']);
    await queryInterface.addIndex('UserRedemptions', ['redeemed_at']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('UserRedemptions');
  }
};