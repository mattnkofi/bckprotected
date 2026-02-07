'use strict';
const bcrypt = require('bcryptjs');

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const hashedPassword = await bcrypt.hash('iamtheAdmin2', 10);

    return queryInterface.bulkInsert('Users', [{
      email: 'kndl.arts@gmail.com',
      password: hashedPassword,
      name: 'Super Admin',
      role: 'admin',
      account_status: 'active',
      email_verified_at: new Date(),
      created_at: new Date(),
      updated_at: new Date()
    }]);
  },

  down: async (queryInterface, Sequelize) => {
    return queryInterface.bulkDelete('Users', { email: 'kndl.arts@gmail.com' }, {});
  }
};