const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const db = require('../config/database');
const jwt = require('jsonwebtoken');

// Đăng ký người dùng mới
router.post('/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Tên đăng nhập và mật khẩu là bắt buộc' });
    }
    
    const connection = await db.getConnection();
    
    // Kiểm tra xem người dùng đã tồn tại chưa
    const [existingUsers] = await connection.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    if (existingUsers.length > 0) {
      connection.release();
      return res.status(400).json({ error: 'Tên đăng nhập đã tồn tại' });
    }
    
    // Hash mật khẩu và lưu người dùng mới
    const hashedPassword = await bcrypt.hash(password, 10);
    await connection.query(
      'INSERT INTO users (username, password, email) VALUES (?, ?, ?)',
      [username, hashedPassword, email]
    );
    
    connection.release();
    res.status(201).json({ message: 'Đăng ký thành công' });
  } catch (error) {
    console.error('Lỗi đăng ký:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

// Đăng nhập
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Tên đăng nhập và mật khẩu là bắt buộc' });
    }
    
    const connection = await db.getConnection();
    const [users] = await connection.query(
      'SELECT * FROM users WHERE username = ?',
      [username]
    );
    
    connection.release();
    
    if (users.length === 0) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }
    
    const user = users[0];
    const passwordMatch = await bcrypt.compare(password, user.password);
    
    if (!passwordMatch) {
      return res.status(401).json({ error: 'Tên đăng nhập hoặc mật khẩu không đúng' });
    }
    
    // Tạo JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username, role: user.role },
      process.env.JWT_SECRET || 'your-secret-key',
      { expiresIn: '1h' }
    );
    
    res.json({ token, userId: user.id, username: user.username, role: user.role });
  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    res.status(500).json({ error: 'Lỗi máy chủ' });
  }
});

// Middleware xác thực JWT
const authenticateJWT = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader) {
    return res.status(401).json({ error: 'Không tìm thấy token xác thực' });
  }
  
  const token = authHeader.split(' ')[1];
  
  jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Token không hợp lệ hoặc đã hết hạn' });
    }
    
    req.user = user;
    next();
  });
};

// Route xác thực: chỉ truy cập nếu đã đăng nhập
router.get('/profile', authenticateJWT, (req, res) => {
  res.json({ user: req.user });
});

module.exports = router;