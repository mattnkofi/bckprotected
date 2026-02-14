'use strict';

/**
 * Migration: Add Gamification Fields to Users Table
 * 
 * Adds score and level tracking for the badge/reward system
 */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add score field
    await queryInterface.addColumn('Users', 'score', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Total points earned by user for reward system'
    });

    // Add level field
    await queryInterface.addColumn('Users', 'level', {
      type: Sequelize.INTEGER,
      defaultValue: 1,
      allowNull: false,
      comment: 'User level for gamification system'
    });

    // Add experience points field (optional, for level progression)
    await queryInterface.addColumn('Users', 'experience_points', {
      type: Sequelize.INTEGER,
      defaultValue: 0,
      allowNull: false,
      comment: 'Experience points for level progression'
    });

    // Add indexes for performance
    await queryInterface.addIndex('Users', ['score']);
    await queryInterface.addIndex('Users', ['level']);
  },

  down: async (queryInterface) => {
    // Remove indexes first
    await queryInterface.removeIndex('Users', ['score']);
    await queryInterface.removeIndex('Users', ['level']);

    // Remove columns
    await queryInterface.removeColumn('Users', 'experience_points');
    await queryInterface.removeColumn('Users', 'level');
    await queryInterface.removeColumn('Users', 'score');
  }
};