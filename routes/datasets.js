const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/datasets — ADMIN: all datasets | USER: only assigned datasets
router.get('/', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'ADMIN') {
      const result = await db.execute(`
        SELECT d.*, u.username as creator_name,
          (SELECT COUNT(*) FROM access_mappings am WHERE am.dataset_id = d.id) as access_count
        FROM datasets d
        JOIN users u ON d.created_by = u.id
        ORDER BY d.created_at DESC
      `);
      return res.json({ datasets: result.rows });
    } else {
      // USER: only explicitly assigned datasets
      const result = await db.execute({
        sql: `
          SELECT d.*, u.username as creator_name, am.granted_at
          FROM datasets d
          JOIN users u ON d.created_by = u.id
          JOIN access_mappings am ON am.dataset_id = d.id
          WHERE am.user_id = ?
          ORDER BY am.granted_at DESC
        `,
        args: [req.user.id],
      });
      return res.json({ datasets: result.rows });
    }
  } catch (err) {
    console.error('Get datasets error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/datasets/:id — Get single dataset (access controlled)
router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (req.user.role === 'ADMIN') {
      const result = await db.execute({
        sql: `SELECT d.*, u.username as creator_name FROM datasets d JOIN users u ON d.created_by = u.id WHERE d.id = ?`,
        args: [id],
      });
      if (result.rows.length === 0) return res.status(404).json({ error: 'Dataset not found.' });
      return res.json({ dataset: result.rows[0] });
    } else {
      // Check if user has access
      const accessCheck = await db.execute({
        sql: 'SELECT id FROM access_mappings WHERE user_id = ? AND dataset_id = ?',
        args: [req.user.id, id],
      });
      if (accessCheck.rows.length === 0) {
        return res.status(403).json({ error: 'Access denied. You are not authorized to view this dataset.' });
      }
      const result = await db.execute({
        sql: `SELECT d.*, u.username as creator_name FROM datasets d JOIN users u ON d.created_by = u.id WHERE d.id = ?`,
        args: [id],
      });
      if (result.rows.length === 0) return res.status(404).json({ error: 'Dataset not found.' });
      return res.json({ dataset: result.rows[0] });
    }
  } catch (err) {
    console.error('Get dataset error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// POST /api/datasets — ADMIN only: create dataset
router.post('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const { name, description, category, size } = req.body;
    if (!name) return res.status(400).json({ error: 'Dataset name is required.' });

    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO datasets (id, name, description, category, size, created_by) VALUES (?, ?, ?, ?, ?, ?)',
      args: [id, name, description || '', category || '', size || '', req.user.id],
    });

    const result = await db.execute({ sql: 'SELECT * FROM datasets WHERE id = ?', args: [id] });
    res.status(201).json({ message: 'Dataset created successfully.', dataset: result.rows[0] });
  } catch (err) {
    console.error('Create dataset error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// PUT /api/datasets/:id — ADMIN only: update dataset
router.put('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, size } = req.body;

    // FIX: Validate name is not empty (was missing before)
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Dataset name is required.' });
    }

    const existing = await db.execute({ sql: 'SELECT id FROM datasets WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Dataset not found.' });

    await db.execute({
      sql: 'UPDATE datasets SET name = ?, description = ?, category = ?, size = ? WHERE id = ?',
      args: [name.trim(), description || '', category || '', size || '', id],
    });

    const result = await db.execute({ sql: 'SELECT * FROM datasets WHERE id = ?', args: [id] });
    res.json({ message: 'Dataset updated successfully.', dataset: result.rows[0] });
  } catch (err) {
    console.error('Update dataset error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/datasets/:id — ADMIN only
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await db.execute({ sql: 'SELECT id FROM datasets WHERE id = ?', args: [id] });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Dataset not found.' });

    await db.execute({ sql: 'DELETE FROM access_mappings WHERE dataset_id = ?', args: [id] });
    await db.execute({ sql: 'DELETE FROM datasets WHERE id = ?', args: [id] });
    res.json({ message: 'Dataset deleted successfully.' });
  } catch (err) {
    console.error('Delete dataset error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
