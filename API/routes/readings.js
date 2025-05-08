const express = require("express");
const router = express.Router();
const db = require("../config/database");

// Middleware để kiểm tra xác thực người dùng
const checkAuth = (req, res, next) => {
  if (!req.session || !req.session.user) {
    return res.status(401).json({ message: "Chưa đăng nhập" });
  }
  next();
};

// Lấy tất cả dữ liệu từ DHT22123213123123
router.get("/readings", async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.query(`
      SELECT temperature, humidity, timestamp 
      FROM DHT22 
      ORDER BY timestamp DESC
      LIMIT 30
    `);
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error("Error fetching readings:", error);
    res.status(500).json({ error: "Lỗi khi lấy dữ liệu" });
  }
});

// Lấy dữ liệu mới nhất
router.get("/readings/latest", async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.query(`
      SELECT temperature, humidity, timestamp 
      FROM DHT22 
      ORDER BY timestamp DESC
      LIMIT 1
    `);
    connection.release();
    res.json(rows[0] || { temperature: 0, humidity: 0 });
  } catch (error) {
    console.error("Error fetching latest reading:", error);
    res.status(500).json({ error: "Lỗi khi lấy dữ liệu mới nhất" });
  }
});

// Lấy tất cả dữ liệu ánh sáng từ BH1370
router.get("/light", async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.query(`
      SELECT light_intensity, timestamp 
      FROM BH1370 
      ORDER BY timestamp DESC
      LIMIT 30
    `);
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error("Error fetching light data:", error);
    res.status(500).json({ error: "Lỗi khi lấy dữ liệu ánh sáng" });
  }
});

// Lấy dữ liệu ánh sáng mới nhất
router.get("/light/latest", async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.query(`
      SELECT light_intensity, timestamp 
      FROM BH1370 
      ORDER BY timestamp DESC
      LIMIT 1
    `);
    connection.release();
    res.json(rows[0] || { light_intensity: 0 });
  } catch (error) {
    console.error("Error fetching latest light data:", error);
    res.status(500).json({ error: "Lỗi khi lấy dữ liệu ánh sáng mới nhất" });
  }
});

// Lấy dữ liệu ánh sáng trong khoảng thời gian
router.get("/light/range", async (req, res) => {
  try {
    const { start, end } = req.query;
    const connection = await db.getConnection();

    let query = `
      SELECT light_intensity, timestamp 
      FROM BH1370 
      WHERE 1=1
    `;

    const params = [];

    if (start) {
      query += ` AND timestamp >= ?`;
      params.push(start);
    }

    if (end) {
      query += ` AND timestamp <= ?`;
      params.push(end);
    }

    query += ` ORDER BY timestamp DESC LIMIT 100`;

    const [rows] = await connection.query(query, params);
    connection.release();
    res.json(rows);
  } catch (error) {
    console.error("Error fetching light data range:", error);
    res
      .status(500)
      .json({ error: "Lỗi khi lấy dữ liệu ánh sáng theo khoảng thời gian" });
  }
});

module.exports = router;
