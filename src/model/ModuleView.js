module.exports = (sequelize, DataTypes) => {
    const ModuleView = sequelize.define('ModuleView', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        module_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    }, {
        tableName: 'ModuleViews',
        timestamps: true,
        underscored: true,
        indexes: [
            {
                unique: true,
                fields: ['module_id', 'user_id'] // Prevents duplicate entries for the same user/module
            }
        ]
    });

    ModuleView.associate = function (models) {
        ModuleView.belongsTo(models.Module, { foreignKey: 'module_id' });
        ModuleView.belongsTo(models.User, { foreignKey: 'user_id' });
    };

    return ModuleView;
};