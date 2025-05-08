const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.get('/readings', async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM readings ORDER BY timestamp DESC LIMIT 100'
    );
    connection.release();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/readings/latest', async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.query(
      'SELECT * FROM readings ORDER BY timestamp DESC LIMIT 1'
    );
    connection.release();
    res.json(rows[0]);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;