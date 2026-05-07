const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../db');
const { authenticate, requireAdmin } = require('../middleware/auth');

// GET /api/access — ADMIN: all access mappings
router.get('/', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT 
        am.id, am.granted_at,
        u.id as user_id, u.username, u.email,
        d.id as dataset_id, d.name as dataset_name, d.category,
        g.username as granted_by_name
      FROM access_mappings am
      JOIN users u ON am.user_id = u.id
      JOIN datasets d ON am.dataset_id = d.id
      JOIN users g ON am.granted_by = g.id
      ORDER BY am.granted_at DESC
    `);
    res.json({ mappings: result.rows });
  } catch (err) {
    console.error('Get mappings error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// GET /api/access/users — ADMIN: list all users
router.get('/users', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await db.execute(
      `SELECT id, username, email, role, created_at FROM users ORDER BY created_at DESC`
    );
    res.json({ users: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

// GET /api/access/user/:userId — ADMIN: get datasets assigned to a specific user
router.get('/user/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await db.execute({
      sql: `
        SELECT d.id, d.name, d.category, d.description, am.granted_at, am.id as mapping_id
        FROM access_mappings am
        JOIN datasets d ON am.dataset_id = d.id
        WHERE am.user_id = ?
        ORDER BY am.granted_at DESC
      `,
      args: [userId],
    });
    res.json({ datasets: result.rows });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

// POST /api/access/assign — ADMIN: assign dataset to user
router.post('/assign', authenticate, requireAdmin, async (req, res) => {
  try {
    const { user_id, dataset_id } = req.body;

    if (!user_id || !dataset_id) {
      return res.status(400).json({ error: 'user_id and dataset_id are required.' });
    }

    // Check user exists and is a USER role (FIX: enforce USER role check)
    const userCheck = await db.execute({
      sql: 'SELECT id, username, role FROM users WHERE id = ?',
      args: [user_id],
    });
    if (userCheck.rows.length === 0) return res.status(404).json({ error: 'User not found.' });
    if (userCheck.rows[0].role !== 'USER') {
      return res.status(400).json({ error: 'Access can only be assigned to users with the USER role.' });
    }

    // Check dataset exists
    const datasetCheck = await db.execute({
      sql: 'SELECT id, name FROM datasets WHERE id = ?',
      args: [dataset_id],
    });
    if (datasetCheck.rows.length === 0) return res.status(404).json({ error: 'Dataset not found.' });

    // Check for duplicate
    const dupCheck = await db.execute({
      sql: 'SELECT id FROM access_mappings WHERE user_id = ? AND dataset_id = ?',
      args: [user_id, dataset_id],
    });
    if (dupCheck.rows.length > 0) {
      return res.status(409).json({ error: 'Access already granted.' });
    }

    const id = uuidv4();
    await db.execute({
      sql: 'INSERT INTO access_mappings (id, user_id, dataset_id, granted_by) VALUES (?, ?, ?, ?)',
      args: [id, user_id, dataset_id, req.user.id],
    });

    res.status(201).json({
      message: `Access granted to "${datasetCheck.rows[0].name}" for user "${userCheck.rows[0].username}".`,
      mapping_id: id,
    });
  } catch (err) {
    console.error('Assign access error:', err);
    res.status(500).json({ error: err.message || 'Internal server error.' });
  }
});

// DELETE /api/access/revoke — ADMIN: revoke dataset access from user
router.delete('/revoke', authenticate, requireAdmin, async (req, res) => {
  try {
    const { user_id, dataset_id } = req.body;

    if (!user_id || !dataset_id) {
      return res.status(400).json({ error: 'user_id and dataset_id are required.' });
    }

    const existing = await db.execute({
      sql: 'SELECT id FROM access_mappings WHERE user_id = ? AND dataset_id = ?',
      args: [user_id, dataset_id],
    });
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Access mapping not found.' });
    }

    await db.execute({
      sql: 'DELETE FROM access_mappings WHERE user_id = ? AND dataset_id = ?',
      args: [user_id, dataset_id],
    });

    res.json({ message: 'Access revoked successfully.' });
  } catch (err) {
    console.error('Revoke access error:', err);
    res.status(500).json({ error: 'Internal server error.' });
  }
});

// DELETE /api/access/revoke/:mappingId — ADMIN: revoke by mapping id
router.delete('/revoke/:mappingId', authenticate, requireAdmin, async (req, res) => {
  try {
    const { mappingId } = req.params;
    const existing = await db.execute({
      sql: 'SELECT id FROM access_mappings WHERE id = ?',
      args: [mappingId],
    });
    if (existing.rows.length === 0) return res.status(404).json({ error: 'Access mapping not found.' });

    await db.execute({ sql: 'DELETE FROM access_mappings WHERE id = ?', args: [mappingId] });
    res.json({ message: 'Access revoked successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error.' });
  }
});

module.exports = router;
