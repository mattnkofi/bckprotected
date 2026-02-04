'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
   up: async (queryInterface, Sequelize) => {
     await queryInterface.createTable('InstructorBadges', {
        badgeId: {
          type: Sequelize.INTEGER,
        references: { model: 'badges', key: 'id' },
          onDelete: 'CASCADE',
          primaryKey: true
        },
        instructorId: {
          type: Sequelize.INTEGER,
          references: { model: 'instructors', key: 'id' },
          onDelete: 'CASCADE',
          primaryKey: true
        }
     });
   },
   down: async (queryInterface) => await queryInterface.dropTable('InstructorBadges')
};