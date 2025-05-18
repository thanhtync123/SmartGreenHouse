const express = require("express");
const router = express.Router();
const db = require("../config/database");

// Lấy hết dữ liệu ánh sáng, không giới hạn
router.get("/bh1750reading", async (req, res) => {
  try {
    const query = "SELECT id, light_intensity, timestamp FROM bh1370 ORDER BY timestamp ASC";
    const [rows] = await db.query(query);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
