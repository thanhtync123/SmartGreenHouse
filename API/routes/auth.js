const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const db = require('../config/database');

// Đăng nhập
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'Vui lòng nhập tên đăng nhập và mật khẩu' 
      });
    }

    const connection = await db.getConnection();
    const [users] = await connection.query('SELECT * FROM users WHERE username = ?', [username]);
    connection.release();

    if (users.length === 0) {
      return res.status(401).json({ 
        success: false, 
        message: 'Tên đăng nhập hoặc mật khẩu không đúng' 
      });
    }

    const user = users[0];
    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'Tên đăng nhập hoặc mật khẩu không đúng' 
      });
    }

    // Nếu đăng nhập thành công, lưu thông tin user vào session
    req.session.user = {
      userId: user.user_id,
      username: user.username,
      role: user.role
    };

    res.json({ 
      success: true, 
      user: {
        userId: user.user_id,
        username: user.username,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Lỗi server, vui lòng thử lại sau' 
    });
  }
});

// Đăng xuất
router.post('/logout', (req, res) => {
  if (req.session) {
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ 
          success: false, 
          message: 'Không thể đăng xuất, vui lòng thử lại' 
        });
      }
      res.json({ success: true, message: 'Đăng xuất thành công' });
    });
  } else {
    res.json({ success: true, message: 'Đã đăng xuất' });
  }
});

// Lấy thông tin người dùng hiện tại
router.get('/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ 
      success: false, 
      message: 'Chưa đăng nhập' 
    });
  }
  res.json({ 
    success: true, 
    user: req.session.user 
  });
});

// Tạo tài khoản admin mặc định nếu chưa có
router.post('/setup-admin', async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.query('SELECT * FROM users WHERE role = "admin" LIMIT 1');

    if (rows.length === 0) {
      // Tạo tài khoản admin với mật khẩu mặc định
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await connection.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'admin']
      );
      connection.release();
      return res.json({ success: true, message: 'Tài khoản admin đã được tạo' });
    }

    connection.release();
    res.json({ success: true, message: 'Tài khoản admin đã tồn tại' });
  } catch (error) {
    console.error('Error setting up admin account:', error);
    res.status(500).json({ success: false, message: 'Lỗi server' });
  }
});

module.exports = router;