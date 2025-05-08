const express = require("express");
const mqtt = require("mqtt"); // Sửa cách import MQTT cho Node.js
require("dotenv").config();
const db = require("./config/database");
const readingRoutes = require("./routes/readings");
const authRoutes = require("./routes/auth"); // Thêm import auth routes

const app = express();
app.use(express.static("public")); // Phục vụ file tĩnh
app.use(express.json());

// Khởi tạo bảng
async function initializeDatabase() {
  try {
    const connection = await db.getConnection();
    await connection.query(`
      CREATE DATABASE IF NOT EXISTS smart_greenhouse;
    `);
    await connection.query(`
      USE smart_greenhouse;
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        role VARCHAR(20) DEFAULT 'user'
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS dht22 (
        id INT AUTO_INCREMENT PRIMARY KEY,
        temperature FLOAT,
        humidity FLOAT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS soil_moisture (
        id INT AUTO_INCREMENT PRIMARY KEY,
        moisture FLOAT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS bh1370 (
        id INT AUTO_INCREMENT PRIMARY KEY,
        light_intensity FLOAT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
    await connection.query(`
      CREATE TABLE IF NOT EXISTS alerts (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sensor_type VARCHAR(20),
        value FLOAT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        message TEXT
      );
    `);
    connection.release();
    console.log("Database initialized");
  } catch (error) {
    console.error("Error initializing database:", error);
  }
}

// Kết nối MQTT
const client = mqtt.connect("mqtt://broker.emqx.io:1883", {
  clientId: "serverClientId" + Math.random().toString(),
});

client.on("connect", () => {
  console.log("MQTT Connected");
  client.subscribe("dht22");
  client.subscribe("soil_moisture");
  client.subscribe("bh1370");
  initializeDatabase();
});

client.on("error", (err) => {
  console.log("MQTT Connection error:", err);
});

client.on("message", async (topic, message) => {
  try {
    const data = JSON.parse(message.toString());
    const connection = await db.getConnection();

    // Insert vào bảng cảm biến tương ứng
    if (data.sensorType === "dht22") {
      await connection.query(
        "INSERT INTO dht22 (temperature, humidity) VALUES (?, ?)",
        [data.temperature, data.humidity]
      );
    } else if (data.sensorType === "soil_moisture") {
      await connection.query(
        "INSERT INTO soil_moisture (moisture) VALUES (?)",
        [data.moisture]
      );
    } else if (data.sensorType === "bh1370") {
      await connection.query(
        "INSERT INTO bh1370 (light_intensity) VALUES (?)",
        [data.light_intensity]
      );
    }

    // Nếu có cảnh báo, thêm vào bảng alerts
    if (data.alert) {
      await connection.query(
        "INSERT INTO alerts (sensor_type, value, message) VALUES (?, ?, ?)",
        [data.sensorType, data.value || null, data.alert]
      );
    }

    connection.release();
    console.log("Saved new reading:", data);
  } catch (error) {
    console.error("Error saving reading:", error);
  }
});

// Routes
app.use("/api", readingRoutes);
app.use("/api/auth", authRoutes); // Thêm auth routes

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
