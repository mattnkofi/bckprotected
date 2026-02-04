// server\src\model\badge.js
'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class Badge extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  Badge.init({
    iconPath: DataTypes.STRING
  }, {
    sequelize,
    modelName: 'badge',
  });
  return Badge;
};