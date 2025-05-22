const express = require("express");
const router = express.Router();
const db = require("../config/database");

router.get("/dht22readings/all", async (req, res) => {
  try {
    const connection = await db.getConnection();
    const [rows] = await connection.query(
      "SELECT * FROM dht22 ORDER BY timestamp DESC"
    );
    connection.release();

    res.json({
      data: rows,
      meta: { total: rows.length },
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
