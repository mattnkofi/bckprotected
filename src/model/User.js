// src/model/User.js
const bcrypt = require('bcryptjs');

module.exports = (sequelize, DataTypes) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true,
            validate: {
                isEmail: { msg: 'Please provide a valid email address' }
            }
        },
        password: {
            type: DataTypes.STRING(255),
            allowNull: true // Nullable for OAuth users
        },
        name: {
            type: DataTypes.STRING(255),
            allowNull: true
        },
        role: {
            type: DataTypes.STRING(50),
            defaultValue: 'player',
            allowNull: false,
            validate: {
                isIn: {
                    args: [['player', 'admin', 'moderator', 'educator']],
                    msg: 'Invalid role'
                }
            }
        },
        // === NEW: Store FILE KEY instead of full URL ===
        avatar_key: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'R2 file key (e.g., avatars/123/file.jpg) - NOT full URL'
        },
        // === DEPRECATED: Keep for migration/compatibility ===
        avatar_url: {
            type: DataTypes.STRING(500),
            allowNull: true,
            comment: 'Legacy URL field. Use avatar_key for new uploads.'
        },
        provider: {
            type: DataTypes.STRING(50),
            allowNull: true,
            validate: {
                isIn: {
                    args: [['local', 'google', 'facebook', null]],
                    msg: 'Invalid provider'
                }
            }
        },
        provider_id: {
            type: DataTypes.STRING(255),
            allowNull: true,
            unique: true
        },
        email_verified_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        password_changed_at: {
            type: DataTypes.DATE,
            allowNull: true,
            comment: 'Track password changes to invalidate old tokens'
        },
        is_profile_public: {
            type: DataTypes.BOOLEAN,
            defaultValue: false,
            allowNull: false,
            comment: 'Whether profile is visible to other users'
        },
        account_status: {
            type: DataTypes.ENUM('active', 'deactivated', 'pending_deletion', 'deleted'),
            defaultValue: 'active',
            allowNull: false
        },
        deactivated_at: {
            type: DataTypes.DATE,
            allowNull: true
        },
        last_login_at: {
            type: DataTypes.DATE,
            allowNull: true
        }
    }, {
        timestamps: true,
        underscored: true,
        tableName: 'Users',
        indexes: [
            { fields: ['email'] },
            { fields: ['provider_id'] },
            { fields: ['account_status'] }
        ],
        // === SCOPES (Fixes SequelizeScopeError in AuthController) ===
        defaultScope: {
            attributes: { exclude: ['password'] }
        },
        scopes: {
            withPassword: {
                attributes: { include: ['password'] }
            }
        }
    });

    // ==================== ASSOCIATIONS ====================
    User.associate = function (models) {
        // Auth & Security
        User.hasMany(models.Session, {
            foreignKey: 'user_id',
            as: 'sessions',
            onDelete: 'CASCADE'
        });
        User.hasMany(models.TokenBlacklist, {
            foreignKey: 'user_id',
            as: 'blacklistedTokens',
            onDelete: 'CASCADE'
        });

        // Files (Explicit association for your File model)
        if (models.File) {
            User.hasMany(models.File, {
                foreignKey: 'uploaded_by',
                as: 'files',
                onDelete: 'CASCADE'
            });
        }

        // Profile & Settings
        User.hasOne(models.UserProfile, {
            foreignKey: 'user_id',
            as: 'profile',
            onDelete: 'CASCADE'
        });
        User.hasOne(models.UserPrivacySettings, {
            foreignKey: 'user_id',
            as: 'privacySettings',
            onDelete: 'CASCADE'
        });
        User.hasOne(models.UserNotificationPreferences, {
            foreignKey: 'user_id',
            as: 'notificationPreferences',
            onDelete: 'CASCADE'
        });

        // Guardians
        User.hasMany(models.UserGuardian, {
            foreignKey: 'user_id',
            as: 'guardians',
            onDelete: 'CASCADE'
        });

        // Account Management
        User.hasOne(models.AccountDeletionRequest, {
            foreignKey: 'user_id',
            as: 'deletionRequest',
            onDelete: 'CASCADE'
        });
    };

    // ==================== INSTANCE METHODS ====================

    /**
     * Validate password (Required for AuthController.login)
     */
    User.prototype.validatePassword = async function (password) {
        if (!this.password) return false;
        return await bcrypt.compare(password, this.password);
    };

    /**
     * Get Smart Avatar URL (Required for ProfileController)
     */
    User.prototype.getAvatarUrl = function () {
        // 1. Use new Key system
        if (this.avatar_key) {
            try {
                const fileStorageService = require('../services/FileStorageService');
                return fileStorageService.constructUrl(this.avatar_key);
            } catch (e) {
                console.error("FileStorageService missing", e);
                return null;
            }
        }

        // 2. Use old URL system (Migration)
        if (this.avatar_url) {
            const oldR2Domain = process.env.OLD_R2_PUBLIC_URL;
            if (oldR2Domain && this.avatar_url.includes(oldR2Domain)) {
                try {
                    const key = this.avatar_url.replace(`${oldR2Domain}/`, '');
                    const fileStorageService = require('../services/FileStorageService');
                    return fileStorageService.constructUrl(key);
                } catch (e) {
                    return this.avatar_url;
                }
            }
            return this.avatar_url;
        }

        // 3. Fallback to default
        try {
            const fileStorageService = require('../services/FileStorageService');
            return fileStorageService.getDefaultAvatar(this.name || this.email);
        } catch (e) {
            return `https://ui-avatars.com/api/?name=${encodeURIComponent(this.name || 'User')}&background=random`;
        }
    };

    /**
     * Security: Check if token is stale (Required for JwtService)
     */
    User.prototype.tokenIssuedBeforePasswordChange = function (tokenIssuedAt) {
        if (!this.password_changed_at) return false;
        const passwordChangedTimestamp = Math.floor(this.password_changed_at.getTime() / 1000);
        return tokenIssuedAt < passwordChangedTimestamp;
    };

    /**
     * Update last login timestamp
     */
    User.prototype.updateLastLogin = async function () {
        this.last_login_at = new Date();
        // Use 'this.save' ensuring we don't trigger hooks unnecessarily or validate everything
        await this.save({ fields: ['last_login_at'], hooks: false });
    };

    // === Role & Status Checkers ===
    User.prototype.isOAuthUser = function () { return !!this.provider && this.provider !== 'local'; };
    User.prototype.isAdmin = function () { return this.role === 'admin'; };
    User.prototype.isEducator = function () { return this.role === 'educator' || this.role === 'admin'; };

    User.prototype.isActive = function () { return this.account_status === 'active'; };
    User.prototype.isDeactivated = function () { return this.account_status === 'deactivated'; };
    User.prototype.isDeleted = function () { return this.account_status === 'deleted'; };
    User.prototype.hasVerifiedEmail = function () { return !!this.email_verified_at; };

    /**
     * Check if account can be reactivated (within 30 days)
     */
    User.prototype.canReactivate = function () {
        if (this.account_status !== 'deactivated') return false;
        if (!this.deactivated_at) return false;

        const deactivatedDate = new Date(this.deactivated_at);
        const now = new Date();
        const daysSinceDeactivation = Math.floor((now - deactivatedDate) / (1000 * 60 * 60 * 24));

        return daysSinceDeactivation <= 30;
    };

    /**
     * Safe JSON (Private view - sent to owner)
     */
    User.prototype.toSafeJSON = function () {
        return {
            id: this.id,
            email: this.email,
            name: this.name,
            role: this.role,
            avatar_url: this.getAvatarUrl(),
            is_profile_public: this.is_profile_public,
            account_status: this.account_status,
            provider: this.provider,
            email_verified: !!this.email_verified_at,
            created_at: this.created_at
        };
    };

    /**
     * Public JSON (Public view - sent to others)
     */
    User.prototype.toPublicJSON = function () {
        return {
            id: this.id,
            name: this.name,
            avatar_url: this.getAvatarUrl(),
            is_profile_public: this.is_profile_public,
            role: this.role
        };
    };

    /**
     * Default JSON serialization (excludes secrets)
     */
    User.prototype.toJSON = function () {
        const values = { ...this.get() };
        delete values.password; // Always hide password
        delete values.avatar_key; // Hide internal storage key
        values.avatar_url = this.getAvatarUrl(); // Expose computed URL
        return values;
    };

    // ==================== CLASS METHODS ====================

    User.findByEmail = async function (email) {
        return await this.findOne({ where: { email: email.toLowerCase() } });
    };

    User.findActive = async function (options = {}) {
        return await this.findAll({ where: { account_status: 'active' }, ...options });
    };

    User.findByRole = async function (role, options = {}) {
        return await this.findAll({ where: { role: role, account_status: 'active' }, ...options });
    };

    // ==================== HOOKS ====================

    User.beforeSave(async (user) => {
        // 1. Lowercase email
        if (user.changed('email')) {
            user.email = user.email.toLowerCase().trim();
        }

        // 2. Hash password
        if (user.changed('password') && user.password) {
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(user.password, salt);

            // Set timestamp if updating existing user
            if (!user.isNewRecord) {
                user.password_changed_at = new Date();
            }
        }
    });

    /**
     * Cleanup Hook: Delete files when user is deleted
     */
    User.beforeDestroy(async (user, options) => {
        // 1. Delete Avatar from Cloud Storage
        if (user.avatar_key) {
            try {
                const fileStorageService = require('../services/FileStorageService');
                await fileStorageService.deleteFile(user.avatar_key);
            } catch (error) {
                console.error(`Failed to delete avatar for user ${user.id}:`, error);
            }
        }

        // 2. Delete Uploaded Files (if File model exists)
        try {
            if (sequelize.models.File) {
                const userFiles = await sequelize.models.File.findAll({
                    where: { uploaded_by: user.id },
                    transaction: options.transaction
                });

                if (userFiles.length > 0) {
                    const fileStorageService = require('../services/FileStorageService');
                    // Delete files from storage
                    await Promise.all(userFiles.map(file =>
                        fileStorageService.deleteFile(file.file_key).catch(e => console.error(e))
                    ));
                    // Database records will be deleted via cascade or explicit destroy if needed
                }
            }
        } catch (error) {
            console.error(`Error during user file cleanup:`, error);
        }
    });

    return User;
};