// routes/auth.js
const express = require('express');
const router = express.Router();

// POST /api/login
router.post('/login', (req, res) => {
  const { email, password } = req.body;

  // Kiểm tra thông tin đăng nhập
  if (email === 'admin@example.com' && password === '123456') {
    res.json({ success: true, message: 'Đăng nhập thành công!' });
  } else {
    res.status(401).json({ success: false, message: 'Sai thông tin đăng nhập!' });
  }
});

module.exports = router;
