const express = require('express');
const router = express.Router();
const db = require('../config/database');

router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const connection = await db.getConnection();
    // Kiểm tra username hoặc email đã tồn tại chưa
    const [users] = await connection.query(
      'SELECT id FROM users WHERE username = ? OR email = ?',
      [username, email]
    );
    if (users.length > 0) {
      connection.release();
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    // Thêm user mới (không băm mật khẩu)
    await connection.query(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, password]
    );
    connection.release();
    res.json({ message: 'Register successful' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;