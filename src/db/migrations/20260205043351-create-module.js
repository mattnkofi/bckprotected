'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Modules', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      title: {
        type: Sequelize.STRING(255),
        allowNull: false,
        comment: 'Module title'
      },
      description: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Module description'
      },
      content: {
        type: Sequelize.TEXT('long'),
        allowNull: true,
        comment: 'Module text content (HTML or Markdown)'
      },
      type: {
        type: Sequelize.ENUM('lesson', 'quiz', 'activity', 'resource', 'assessment'),
        allowNull: false,
        defaultValue: 'lesson',
        comment: 'Type of module'
      },
      category: {
        type: Sequelize.ENUM('gad', 'sexual_health', 'vawc', 'general'),
        allowNull: false,
        defaultValue: 'general',
        comment: 'Module category'
      },
      difficulty_level: {
        type: Sequelize.ENUM('beginner', 'intermediate', 'advanced'),
        allowNull: false,
        defaultValue: 'beginner',
        comment: 'Difficulty level'
      },
      age_group: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'Target age group (e.g., "13-15", "16-18", "18+")'
      },
      file_key: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'R2 storage key for the main resource file (PDF/DOCX)'
      },
      file_name: {
        type: Sequelize.STRING(255),
        allowNull: true,
        comment: 'Original filename'
      },
      file_type: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'MIME type of the file'
      },
      file_size: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'File size in bytes'
      },
      thumbnail_key: {
        type: Sequelize.STRING(500),
        allowNull: true,
        comment: 'R2 storage key for thumbnail image'
      },
      duration_minutes: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Estimated completion time in minutes'
      },
      points: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Points awarded for completing this module'
      },
      order: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Display order within category'
      },
      is_published: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether module is visible to users'
      },
      is_featured: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: false,
        comment: 'Whether module is featured on homepage'
      },
      required_modules: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of module IDs that must be completed first'
      },
      tags: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Array of tags for searchability'
      },
      metadata: {
        type: Sequelize.JSON,
        allowNull: true,
        comment: 'Additional metadata (learning objectives, outcomes, etc.)'
      },
      created_by: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT',
        comment: 'User who created this module'
      },
      updated_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
        comment: 'User who last updated this module'
      },
      view_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of times module has been viewed'
      },
      completion_count: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
        comment: 'Number of times module has been completed'
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      },
      published_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'When the module was first published'
      },
      deleted_at: {
        type: Sequelize.DATE,
        allowNull: true,
        comment: 'Soft delete timestamp'
      }
    });

    // Indexes for performance
    await queryInterface.addIndex('Modules', ['type']);
    await queryInterface.addIndex('Modules', ['category']);
    await queryInterface.addIndex('Modules', ['difficulty_level']);
    await queryInterface.addIndex('Modules', ['is_published']);
    await queryInterface.addIndex('Modules', ['is_featured']);
    await queryInterface.addIndex('Modules', ['created_by']);
    await queryInterface.addIndex('Modules', ['order']);
    await queryInterface.addIndex('Modules', ['deleted_at']); // For soft deletes
  },

  down: async (queryInterface) => {
    await queryInterface.dropTable('Modules');
  }
};