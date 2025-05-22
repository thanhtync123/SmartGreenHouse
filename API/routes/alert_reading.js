const express = require("express");
const router = express.Router();
const db = require("../config/database");

// Lấy hết dữ liệu ánh sáng, không giới hạn
router.get("/alert_reading", async (req, res) => {
  try {
    const query =
      "SELECT id, sensor_type, value, timestamp, message FROM alerts";
    const [rows] = await db.query(query);
    res.json({ data: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
