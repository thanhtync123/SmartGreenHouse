const express = require("express");
const path = require("path");
const app = express();
const mqtt = require("mqtt");
const session = require("express-session");
require("dotenv").config();
const db = require("./config/database");
const dht22AllreadingRoutes = require("./routes/dht22Allreadings");
const authRoutes = require("./routes/auth");
const bh1750readingRouter = require("./routes/bh1750reading");
const alert_readingRouter = require("./routes/alert_reading");

// Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Thiết lập session middleware
app.use(
  session({
    secret: "smart_greenhouse_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      maxAge: 24 * 60 * 60 * 1000, // 1 ngày
    },
  })
);

// Middleware kiểm tra xác thực
const isAuthenticated = (req, res, next) => {
  if (req.session && req.session.isLoggedIn) {
    return next();
  }
  res.redirect("/login");
};

// Các route không cần xác thực
app.get("/login", (req, res) => {
  if (req.session && req.session.isLoggedIn) {
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/register", (req, res) => {
  if (req.session && req.session.isLoggedIn) {
    return res.redirect("/");
  }
  res.sendFile(path.join(__dirname, "public", "register.html"));
});

// API routes
app.use("/api", authRoutes);

// Route cần xác thực
app.get("/", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get("/controls", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "controls.html"));
});

app.get("/analytics", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "analytics.html"));
});

app.get("/notifications", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "notifications.html"));
});

app.get("/schedule", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "schedule.html"));
});

app.get("/settings", isAuthenticated, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "settings.html"));
});

// API routes có thể cần xác thực hoặc không tùy theo yêu cầu
app.use("/api", dht22AllreadingRoutes);
app.use("/api", bh1750readingRouter);
app.use("/api", alert_readingRouter);
// Thêm debug info để kiểm tra các route
const publicPath = path.join(__dirname, "public");
console.log("Serving static files from:", publicPath);

// In danh sách các file tồn tại trong thư mục public
const fs = require("fs");
console.log("Files in public directory:");
try {
  const files = fs.readdirSync(publicPath);
  files.forEach((file) => console.log(" - " + file));
} catch (err) {
  console.error("Error reading public directory:", err);
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
    // console.log(
    //   "Nhận tin nhắn từ chủ đề:",
    //   topic,
    //   "Dữ liệu:",
    //   message.toString()
    // );
    // Phần còn lại của mã
  });

  client.on("connect", () => {
    console.log("MQTT Connected");
    client.subscribe("dht22");
    client.subscribe("soil_moisture");
    client.subscribe("light_sensor");
    client.subscribe("light_over_threshold");
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
      } else if (topic === "light_sensor") {
        const lightValue = data.light;
        await connection.query(
          "INSERT INTO bh1370 (light_intensity) VALUES (?)",
          [lightValue]
        );
      }

      if (topic === "light_over_threshold") {
        // Kiểm tra xem đã có cảnh báo tương tự trong 5 phút gần nhất chưa
        const [existingAlerts] = await connection.query(
          "SELECT id FROM alerts WHERE sensor_type = ? AND message = ? AND timestamp >= NOW() - INTERVAL 5 MINUTE",
          [data.sensor_type, data.message]
        );
        if (existingAlerts.length === 0) {
          await connection.query(
            "INSERT INTO alerts (sensor_type, value, message) VALUES (?, ?, ?)",
            [data.sensor_type, data.value || null, data.message]
          );
        }
      }

      connection.release();
      // console.log("Saved new reading:", data);
    } catch (error) {
      console.error("Error saving reading:", error);
    }
  });
}

// // =======================
// // Start Server
// // =======================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  setupMqtt();
});
