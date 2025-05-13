// routes/auth.js
const express = require('express');
const router = express.Router();
const db = require('../config/database');
// POST /api/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;
  if (email === 'admin@example.com' && password === '123456') {
    res.json({ success: true, message: 'Đăng nhập thành công!' });
  } else {
    res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập!' });
  }
});

router.post('/register', (req, res) => {
    const { username, email, password } = req.body;
  const sql = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
  db.query(sql, [username, email, password], (err, result) => {
     if (err) {
      console.error(err);
      return res.status(500).json({ error: 'Có lỗi xảy ra' });
    }
    res.json(result); // Trả về kết quả của truy vấn
  });
    
    
});


module.exports = router;
