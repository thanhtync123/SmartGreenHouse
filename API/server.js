const express = require("express");
const mqtt = require("paho-mqtt"); // Sửa cách import
require("dotenv").config();
const db = require("./config/database");
const readingRoutes = require("./routes/readings");

const app = express();
app.use(express.static("public")); // Phục vụ file tĩnh
app.use(express.json());

// Khởi tạo bảng
async function initializeDatabase() {
  try {
    const connection = await db.getConnection();
    await connection.query(`
      CREATE TABLE IF NOT EXISTS readings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        temperature FLOAT NOT NULL,
        humidity FLOAT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    connection.release();
    console.log("Database initialized");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

// Kết nối MQTT
const client = new mqtt.Client(
  "broker.emqx.io",
  Number(8083),
  "serverClientId" + Math.random().toString()
);

client.onConnectionLost = (responseObject) => {
  if (responseObject.errorCode !== 0) {
    console.log("Connection Lost: " + responseObject.errorMessage);
  }
};

client.onMessageArrived = async (message) => {
  try {
    const data = JSON.parse(message.payloadString);
    const connection = await db.getConnection();
    await connection.query(
      "INSERT INTO readings (temperature, humidity) VALUES (?, ?)",
      [data.temperature, data.humidity]
    );
    connection.release();
    console.log("Saved new reading:", data);
  } catch (error) {
    console.error("Error saving reading:", error);
  }
};

client.connect({
  onSuccess: () => {
    console.log("MQTT Connected");
    client.subscribe("dht22");
    initializeDatabase();
  },
  onFailure: (err) => {
    console.log("MQTT Connection failed:", err);
  },
});

// Routes
app.use("/api", readingRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
