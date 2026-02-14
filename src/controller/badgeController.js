// backend\src\controller\BadgeController.js
const { Badge } = require('../model');
const BadgeService = require('../services/BadgeService');
const { Op } = require('sequelize');

/**
 * Badge Controller - HTTP handlers for badge management
 */
class BadgeController {
  /**
   * GET /api/badges
   * Get all badges
   */
  async getAllBadges(req, res) {
    try {
      const {
        category,
        rarity,
        isActive,
        search,
        page = 1,
        limit = 50,
        sortBy = 'sortOrder',
        sortOrder = 'ASC'
      } = req.query;

      // Build where clause
      const whereClause = {};

      if (category) {
        whereClause.category = category;
      }

      if (rarity) {
        whereClause.rarity = rarity;
      }

      // if (isActive !== undefined) {
      //   whereClause.isActive = isActive === 'true';
      // }
      if (isActive !== undefined && isActive !== '') {
        whereClause.isActive = isActive === 'true';
      }

      if (search) {
        whereClause[Op.or] = [
          { name: { [Op.like]: `%${search}%` } },
          { description: { [Op.like]: `%${search}%` } }
        ];
      }

      // Pagination
      const offset = (parseInt(page) - 1) * parseInt(limit);

      const { count, rows: badges } = await Badge.findAndCountAll({
        where: whereClause,
        limit: parseInt(limit),
        offset: offset,
        order: [[sortBy, sortOrder.toUpperCase()]]
      });

      res.json({
        success: true,
        data: badges,
        pagination: {
          total: count,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(count / parseInt(limit))
        }
      });
    } catch (error) {
      console.error('Get all badges error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch badges',
        message: error.message
      });
    }
  }

  /**
   * GET /api/badges/:id
   * Get badge by ID
   */
  async getBadgeById(req, res) {
    try {
      const { id } = req.params;

      const badge = await Badge.findByPk(id);

      if (!badge) {
        return res.status(404).json({
          success: false,
          error: 'Badge not found'
        });
      }

      res.json({
        success: true,
        data: badge
      });
    } catch (error) {
      console.error('Get badge by ID error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch badge',
        message: error.message
      });
    }
  }

  /**
   * POST /api/badges
   * Create new badge with icon upload
   */
  async createBadge(req, res) {
    try {
      // Validate file upload
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'Badge icon is required'
        });
      }

      // Validate badge icon
      const validation = BadgeService.validateBadgeIcon({
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        size: req.file.size
      });

      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: 'Invalid badge icon',
          details: validation.errors
        });
      }

      // Extract badge data from request body
      const {
        name,
        description,
        category = 'achievement',
        rarity = 'common',
        isActive = true,
        sortOrder = 0
      } = req.body;

      // Validate required fields
      if (!name) {
        return res.status(400).json({
          success: false,
          error: 'Badge name is required'
        });
      }

      // Create badge record first (to get ID for upload path)
      const badge = await Badge.create({
        name,
        description,
        category,
        rarity,
        isActive,
        sortOrder,
        iconKey: 'temp' // Temporary value
      });

      // Upload icon to R2
      const uploadResult = await BadgeService.uploadBadgeIcon(
        req.file.buffer,
        badge.id,
        req.file.mimetype,
        req.file.originalname
      );

      // Update badge with actual icon key
      badge.iconKey = uploadResult.key;
      await badge.save();

      res.status(201).json({
        success: true,
        message: 'Badge created successfully',
        data: badge
      });
    } catch (error) {
      console.error('Create badge error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create badge',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/badges/:id
   * Update badge (with optional icon update)
   */
  async updateBadge(req, res) {
    try {
      const { id } = req.params;

      const badge = await Badge.findByPk(id);

      if (!badge) {
        return res.status(404).json({
          success: false,
          error: 'Badge not found'
        });
      }

      // Extract update data
      const {
        name,
        description,
        category,
        rarity,
        isActive,
        sortOrder
      } = req.body;

      // Update text fields
      if (name !== undefined) badge.name = name;
      if (description !== undefined) badge.description = description;
      if (category !== undefined) badge.category = category;
      if (rarity !== undefined) badge.rarity = rarity;
      if (isActive !== undefined) badge.isActive = isActive;
      if (sortOrder !== undefined) badge.sortOrder = sortOrder;

      // Handle icon update if file provided
      if (req.file) {
        // Validate new icon
        const validation = BadgeService.validateBadgeIcon({
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
          size: req.file.size
        });

        if (!validation.valid) {
          return res.status(400).json({
            success: false,
            error: 'Invalid badge icon',
            details: validation.errors
          });
        }

        const oldIconKey = badge.iconKey;

        // Upload new icon
        const uploadResult = await BadgeService.updateBadgeIcon(
          req.file.buffer,
          badge.id,
          oldIconKey,
          req.file.mimetype,
          req.file.originalname
        );

        badge.iconKey = uploadResult.key;
      }

      await badge.save();

      res.json({
        success: true,
        message: 'Badge updated successfully',
        data: badge
      });
    } catch (error) {
      console.error('Update badge error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update badge',
        message: error.message
      });
    }
  }

  /**
   * DELETE /api/badges/:id
   * Delete badge and its icon
   */
  async deleteBadge(req, res) {
    try {
      const { id } = req.params;

      const badge = await Badge.findByPk(id);

      if (!badge) {
        return res.status(404).json({
          success: false,
          error: 'Badge not found'
        });
      }

      const iconKey = badge.iconKey;

      // Delete from database
      await badge.destroy();

      // Delete icon from R2
      if (iconKey) {
        await BadgeService.deleteBadgeIcon(iconKey).catch(err => {
          console.warn(`Failed to delete badge icon from R2: ${iconKey}`, err);
          // Don't fail the request if R2 delete fails
        });
      }

      res.json({
        success: true,
        message: 'Badge deleted successfully'
      });
    } catch (error) {
      console.error('Delete badge error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete badge',
        message: error.message
      });
    }
  }

  /**
   * GET /api/badges/categories
   * Get all badge categories
   */
  async getCategories(req, res) {
    try {
      const categories = ['achievement', 'milestone', 'special', 'seasonal', 'quiz', 'learning'];

      res.json({
        success: true,
        data: categories
      });
    } catch (error) {
      console.error('Get categories error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch categories',
        message: error.message
      });
    }
  }

  /**
   * GET /api/badges/rarities
   * Get all badge rarities
   */
  async getRarities(req, res) {
    try {
      const rarities = ['common', 'uncommon', 'rare', 'epic', 'legendary'];

      res.json({
        success: true,
        data: rarities
      });
    } catch (error) {
      console.error('Get rarities error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to fetch rarities',
        message: error.message
      });
    }
  }
}

module.exports = new BadgeController();