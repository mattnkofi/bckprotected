const { badge } = require('../model/index'); // Adjust if your models are in src/models
const fs = require('fs/promises');
const path = require('path');

exports.createBadge = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
    const badge = await badge.create({
      iconPath: `/uploads/badges/${req.file.filename}`
    });
    res.status(201).json(badge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.getAllBadges = async (req, res) => {
  try {
    const badges = await badge.findAll();
    res.json(badges);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.updateBadge = async (req, res) => {
  try {
    const badge = await badge.findByPk(req.params.id);
    if (!badge) return res.status(404).json({ error: 'Badge not found' });

    if (req.file) {
      // 1. Path to the OLD file
      const oldPath = path.join(__dirname, '../../public', badge.iconPath);
      
      // 2. Delete the old file from the folder
      await fs.unlink(oldPath).catch(() => console.log("Old file not found on disk"));
      
      // 3. Update the database with the NEW file path
      badge.iconPath = `/uploads/badges/${req.file.filename}`;
      await badge.save();
    }

    res.json(badge);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.deleteBadge = async (req, res) => {
  try {
    const badge = await badge.findByPk(req.params.id);
    if (!badge) return res.status(404).json({ error: 'Badge not found' });

    // Path logic: Go up from src/controller to root, then into public
    const filePath = path.join(__dirname, '../../public', badge.iconPath);
    
    await fs.unlink(filePath).catch(() => console.log("File already gone from disk"));
    await badge.destroy();
    
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};