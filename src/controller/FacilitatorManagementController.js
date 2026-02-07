// src/controller/FacilitatorManagementController.js
const { User } = require('../model');
const { Op } = require('sequelize');
const crypto = require('crypto');
const emailService = require('../services/EmailService');

/**
 * Admin: Create facilitator account
 */
exports.createFacilitator = async (req, res, next) => {
    try {
        // Ensure requester is admin
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                message: 'Only administrators can create facilitator accounts.'
            });
        }

        const { email, name, role } = req.body;

        // Validation
        if (!email || !name) {
            return res.status(422).json({
                message: 'Email and name are required.',
                errors: {
                    email: !email ? ['Email is required'] : [],
                    name: !name ? ['Name is required'] : []
                }
            });
        }

        // Validate role (only educator or moderator can be created this way)
        const allowedRoles = ['educator', 'moderator'];
        const facilitatorRole = role && allowedRoles.includes(role) ? role : 'educator';

        // Check if user already exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(422).json({
                message: 'A user with this email already exists.',
                errors: {
                    email: ['This email is already registered']
                }
            });
        }

        // Generate a secure temporary password
        const tempPassword = crypto.randomBytes(8).toString('base64').slice(0, 12);

        // Create facilitator account
        const facilitator = await User.create({
            email: email.toLowerCase().trim(),
            password: tempPassword,
            name: name.trim(),
            role: facilitatorRole,
            provider: 'local',
            email_verified_at: new Date(), // Auto-verify for admin-created accounts
            requires_password_change: true // Flag for first-time login
        });

        // Send welcome email with temporary password
        await emailService.sendFacilitatorWelcomeEmail(facilitator, tempPassword, {
            createdBy: req.user.name || req.user.email
        });

        res.status(201).json({
            message: 'Facilitator account created successfully. Welcome email sent.',
            facilitator: {
                id: facilitator.id,
                email: facilitator.email,
                name: facilitator.name,
                role: facilitator.role,
                created_at: facilitator.created_at
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Admin: Get all facilitators
 */
exports.getFacilitators = async (req, res, next) => {
    try {
        if (!req.user || !['admin', 'educator'].includes(req.user.role)) {
            return res.status(403).json({
                message: 'Unauthorized access.'
            });
        }

        const { page = 1, limit = 20, role, status } = req.query;

        const whereClause = {
            role: role ? role : { [Op.in]: ['educator', 'moderator'] }
        };

        if (status) {
            whereClause.account_status = status;
        }

        const { count, rows: facilitators } = await User.findAndCountAll({
            where: whereClause,
            limit: parseInt(limit),
            offset: (parseInt(page) - 1) * parseInt(limit),
            order: [['created_at', 'DESC']],
            attributes: { exclude: ['password'] }
        });

        res.json({
            facilitators: facilitators.map(f => ({
                id: f.id,
                email: f.email,
                name: f.name,
                role: f.role,
                account_status: f.account_status,
                email_verified: !!f.email_verified_at,
                requires_password_change: f.requires_password_change,
                last_login_at: f.last_login_at,
                created_at: f.created_at
            })),
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(count / parseInt(limit))
            }
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Admin: Update facilitator role or status
 */
exports.updateFacilitator = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                message: 'Only administrators can update facilitator accounts.'
            });
        }

        const { facilitatorId } = req.params;
        const { role, account_status } = req.body;

        const facilitator = await User.findByPk(facilitatorId);

        if (!facilitator || !['educator', 'moderator'].includes(facilitator.role)) {
            return res.status(404).json({
                message: 'Facilitator not found.'
            });
        }

        // Update fields
        if (role && ['educator', 'moderator'].includes(role)) {
            facilitator.role = role;
        }

        if (account_status && ['active', 'deactivated'].includes(account_status)) {
            facilitator.account_status = account_status;
            if (account_status === 'deactivated') {
                facilitator.deactivated_at = new Date();
            }
        }

        await facilitator.save();

        res.json({
            message: 'Facilitator updated successfully.',
            facilitator: facilitator.toSafeJSON()
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Admin: Resend welcome email with new temporary password
 */
exports.resendWelcomeEmail = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                message: 'Only administrators can resend welcome emails.'
            });
        }

        const { facilitatorId } = req.params;

        const facilitator = await User.scope('withPassword').findByPk(facilitatorId);

        if (!facilitator || !['educator', 'moderator'].includes(facilitator.role)) {
            return res.status(404).json({
                message: 'Facilitator not found.'
            });
        }

        // Generate new temporary password
        const tempPassword = crypto.randomBytes(8).toString('base64').slice(0, 12);

        // Update password
        facilitator.password = tempPassword;
        facilitator.requires_password_change = true;
        facilitator.password_changed_at = null; // Reset password change tracking
        await facilitator.save();

        // Send new welcome email
        await emailService.sendFacilitatorWelcomeEmail(facilitator, tempPassword, {
            isResend: true,
            createdBy: req.user.name || req.user.email
        });

        res.json({
            message: 'New temporary password generated and welcome email sent.'
        });
    } catch (error) {
        next(error);
    }
};

/**
 * Admin: Delete facilitator account
 */
exports.deleteFacilitator = async (req, res, next) => {
    try {
        if (!req.user || req.user.role !== 'admin') {
            return res.status(403).json({
                message: 'Only administrators can delete facilitator accounts.'
            });
        }

        const { facilitatorId } = req.params;

        const facilitator = await User.findByPk(facilitatorId);

        if (!facilitator || !['educator', 'moderator'].includes(facilitator.role)) {
            return res.status(404).json({
                message: 'Facilitator not found.'
            });
        }

        // Prevent deleting own account
        if (facilitator.id === req.user.id) {
            return res.status(400).json({
                message: 'You cannot delete your own account.'
            });
        }

        await facilitator.destroy();

        res.json({
            message: 'Facilitator account deleted successfully.'
        });
    } catch (error) {
        next(error);
    }
};

module.exports = exports;