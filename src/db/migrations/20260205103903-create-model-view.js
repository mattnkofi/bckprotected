'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ModuleViews', {
      id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
      module_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Modules', key: 'id' },
        onDelete: 'CASCADE'
      },
      user_id: {
        type: Sequelize.INTEGER,
        references: { model: 'Users', key: 'id' },
        onDelete: 'CASCADE'
      },
      created_at: { allowNull: false, type: Sequelize.DATE },
      updated_at: { allowNull: false, type: Sequelize.DATE }
    });

    // Add unique constraint
    await queryInterface.addIndex('ModuleViews', ['module_id', 'user_id'], { unique: true });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('ModuleViews');
  }
};