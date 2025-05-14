const express = require("express");
const path = require("path"); 
const app = express();
const mqtt = require("mqtt");
require("dotenv").config();
const db = require("./config/database");
<<<<<<< HEAD
const readingRoutes = require("./routes/dht22readings");
const authRoutes = require("./routes/auth");
const path = require("path");

const app = express();

// Middleware
=======
app.use(express.static(path.join(__dirname, 'public')));
// Route
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});
app.get('/register', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'register.html'));
});
const authRouter = require('./routes/auth');
>>>>>>> 0008adecfea34dc9121d32e66ca597198fa07565
app.use(express.json());
app.use('/api', authRouter);

<<<<<<< HEAD
// API Routes
app.use("/api", authRoutes);
app.use("/api", readingRoutes);
=======
>>>>>>> 0008adecfea34dc9121d32e66ca597198fa07565



// Thêm debug info để kiểm tra các route
const publicPath = path.join(__dirname, 'public');
console.log('Serving static files from:', publicPath);

// In danh sách các file tồn tại trong thư mục public
const fs = require('fs');
console.log('Files in public directory:');
try {
  const files = fs.readdirSync(publicPath);
  files.forEach(file => console.log(' - ' + file));
} catch (err) {
  console.error('Error reading public directory:', err);
}

// =======================
// Database Initialization
// =======================
async function initializeDatabase() {
  try {
    const connection = await db.getConnection();
    await connection.query(`CREATE DATABASE IF NOT EXISTS smart_greenhouse;`);
    await connection.query(`USE smart_greenhouse;`);
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

// =======================
// MQTT Handler
// =======================
function setupMqtt() {
  const client = mqtt.connect("mqtt://broker.emqx.io:1883", {
    clientId: "serverClientId" + Math.random().toString(),
  });

  client.on("message", async (topic, message) => {
    console.log(
      "Nhận tin nhắn từ chủ đề:",
      topic,
      "Dữ liệu:",
      message.toString()
    );
    // Phần còn lại của mã
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
      // Insert sensor data
      if (topic === "dht22") {
        await connection.query(
          "INSERT INTO dht22 (temperature, humidity) VALUES (?, ?)",
          [data.temperature, data.humidity]
        );
      } else if (topic === "soil_moisture") {
        await connection.query(
          "INSERT INTO soil_moisture (moisture) VALUES (?)",
          [data.moisture]
        );
      } else if (topic === "bh1370") {
        await connection.query(
          "INSERT INTO bh1370 (light_intensity) VALUES (?)",
          [data.light_intensity]
        );
      }

      // Insert alert if exists
      if (topic) {
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
}

// // =======================
// // Start Server
// // =======================
const PORT =  3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
<<<<<<< HEAD
  setupMqtt();
});
=======
  //setupMqtt();
});
>>>>>>> 0008adecfea34dc9121d32e66ca597198fa07565
