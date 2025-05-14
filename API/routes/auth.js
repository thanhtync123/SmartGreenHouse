const express = require("express");
const router = express.Router();
const db = require("../config/database");
// xin chafousdfhksdhfkhsdkjfh
router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    const connection = await db.getConnection();
    // Kiểm tra username hoặc email đã tồn tại chưa
    const [users] = await connection.query(
      "SELECT id FROM users WHERE username = ? OR email = ?",
      [username, email]
    );
    if (users.length > 0) {
      connection.release();
      return res
        .status(409)
        .json({ error: "Username or email already exists" });
    }
    // Thêm user mới (không băm mật khẩu)
    await connection.query(
      "INSERT INTO users (username, email, password) VALUES (?, ?, ?)",
      [username, email, password]
    );
    connection.release();
    res.json({ message: "Register successful" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Missing username or password" });
  }
  try {
    const connection = await db.getConnection();
    // Cho phép đăng nhập bằng username hoặc email
    const [users] = await connection.query(
      "SELECT * FROM users WHERE username = ? OR email = ? LIMIT 1",
      [username, username]
    );
    connection.release();
    if (users.length === 0) {
      return res.status(401).json({ error: "User not found" });
    }
    const user = users[0];
    if (user.password !== password) {
      return res.status(401).json({ error: "Incorrect password" });
    }
    // Đăng nhập thành công
    res.json({
      message: "Login successful",
      username: user.username,
      role: user.role,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
