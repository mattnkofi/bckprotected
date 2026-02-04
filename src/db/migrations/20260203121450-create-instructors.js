'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('instructors', {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      // The link to your existing users table
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true, // One user can only be one instructor
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE'
      },
      bio: { type: Sequelize.TEXT }, // Optional extra field
      createdAt: { type: Sequelize.DATE, allowNull: false },
      updatedAt: { type: Sequelize.DATE, allowNull: false }
    });
  },
  down: async (queryInterface) => await queryInterface.dropTable('instructors')
};
