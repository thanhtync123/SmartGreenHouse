const express = require("express");
const router = express.Router();
const db = require("../config/database");

router.get("/dht22readings", async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 100, 1000); // Cap limit at 1000
    const offset = parseInt(req.query.offset) || 0;

    const connection = await db.getConnection();
    const [rows] = await connection.query(
      "SELECT * FROM dht22 ORDER BY timestamp DESC LIMIT ? OFFSET ?",
      [limit, offset]
    );
    connection.release();

    res.json({
      data: rows,
      meta: { limit, offset, total: rows.length },
    });
  } catch (error) {
    console.error("Error fetching DHT22 readings:", error);
    res.status(500).json({
      error: "Failed to fetch readings",
      details: error.message,
    });
  }
});

module.exports = router;
