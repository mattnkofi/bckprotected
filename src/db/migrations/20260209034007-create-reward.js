'use strict';

/**
 * Migration: Create Rewards Table for Redeemable Items
 * 
 * This table stores tangible rewards (prizes, items, vouchers) 
 * that users can redeem using their points
 */
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
        comment: 'Name of the reward item (e.g., "Wireless Mouse", "Gift Card")'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Description of the reward item'
      },
      image_url: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'Image of the reward item'
      },
      points_required: {
        type: Sequelize.INTEGER,
        allowNull: false,
        comment: 'Points needed to redeem this reward'
      },
      stock_quantity: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Available quantity of this reward'
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false,
        comment: 'Whether this reward is available for redemption'
      },
      category: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Category (e.g., "Electronics", "Gift Cards", "Merchandise")'
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

    // Indexes for performance
    await queryInterface.addIndex('Rewards', ['points_required']);
    await queryInterface.addIndex('Rewards', ['is_active']);
    await queryInterface.addIndex('Rewards', ['category']);
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Rewards');
  }
};