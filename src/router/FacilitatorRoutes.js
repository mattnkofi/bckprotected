// src/routes/FacilitatorRoutes.js
const express = require('express');
const router = express.Router();
const facilitatorController = require('../controller/FacilitatorManagementController');
const { authenticate, requireRole } = require('../middleware/AuthMiddleware');

// All routes require authentication
router.use(authenticate);

// ===== Admin-Only Routes =====

/**
 * @route   POST /api/v1/facilitators
 * @desc    Create new facilitator account (Admin only)
 * @access  Admin
 */
router.post('/', requireRole('admin'), facilitatorController.createFacilitator);

/**
 * @route   GET /api/v1/facilitators
 * @desc    Get all facilitators with pagination
 * @access  Admin, Educator
 */
router.get('/', requireRole(['admin', 'educator']), facilitatorController.getFacilitators);

/**
 * @route   PATCH /api/v1/facilitators/:facilitatorId
 * @desc    Update facilitator role or status
 * @access  Admin
 */
router.patch('/:facilitatorId', requireRole('admin'), facilitatorController.updateFacilitator);

/**
 * @route   POST /api/v1/facilitators/:facilitatorId/resend-welcome
 * @desc    Resend welcome email with new temporary password
 * @access  Admin
 */
router.post('/:facilitatorId/resend-welcome', requireRole('admin'), facilitatorController.resendWelcomeEmail);

/**
 * @route   DELETE /api/v1/facilitators/:facilitatorId
 * @desc    Delete facilitator account
 * @access  Admin
 */
router.delete('/:facilitatorId', requireRole('admin'), facilitatorController.deleteFacilitator);

module.exports = router;