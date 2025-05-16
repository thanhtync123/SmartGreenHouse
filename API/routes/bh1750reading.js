const express = require("express");
const router = express.Router();
const db = require("../config/database");

// Lấy dữ liệu ánh sáng mới nhất (giới hạn số lượng bản ghi)
router.get("/", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    const date = req.query.date;
    let query = "SELECT light_intensity, timestamp FROM bh1370";
    let params = [];
    if (date) {
      query += " WHERE DATE(timestamp) = ?";
      params.push(date);
    }
    query += " ORDER BY timestamp DESC LIMIT ?";
    params.push(limit);
    const [rows] = await db.query(query, params);
    res.json({ data: rows.reverse() }); // Đảo ngược để thời gian tăng dần
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
