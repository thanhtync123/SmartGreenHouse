const express = require('express');
const mqtt = require('paho-mqtt');
require('dotenv').config();
const db = require('./config/database');
const session = require('express-session');
const readingRoutes = require('./routes/readings');
const authRoutes = require('./routes/auth');

const app = express();
app.use(express.static('public'));
app.use(express.json());

// Cấu hình session
app.use(session({
  secret: 'smart_green_house_secret_key',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // set to true if using HTTPS
    maxAge: 24 * 60 * 60 * 1000 // 1 day
  }
}));

// Khởi tạo bảng (đã loại bỏ readings)
async function initializeDatabase() {
  try {
    const connection = await db.getConnection();
    // Tạo bảng users
    await connection.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        email VARCHAR(100),
        role VARCHAR(20) DEFAULT 'user'
      )
    `);
    // Tạo bảng DHT22
    await connection.query(`
      CREATE TABLE IF NOT EXISTS DHT22 (
        id INT AUTO_INCREMENT PRIMARY KEY,
        temperature FLOAT NOT NULL,
        humidity FLOAT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Tạo bảng Soil_Moisture
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Soil_Moisture (
        id INT AUTO_INCREMENT PRIMARY KEY,
        moisture FLOAT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Tạo bảng BH1370
    await connection.query(`
      CREATE TABLE IF NOT EXISTS BH1370 (
        id INT AUTO_INCREMENT PRIMARY KEY,
        light_intensity FLOAT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    // Tạo bảng Alert
    await connection.query(`
      CREATE TABLE IF NOT EXISTS Alert (
        id INT AUTO_INCREMENT PRIMARY KEY,
        sensor_type VARCHAR(20) NOT NULL,
        value FLOAT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        message TEXT
      )
    `);
    connection.release();
    console.log('Database initialized');
  } catch (error) {
    console.error('Error initializing database:', error);
  }
}

// Kết nối MQTT
const client = new mqtt.Client("broker.emqx.io", Number(8083), "serverClientId" + Math.random().toString());

client.onConnectionLost = (responseObject) => {
  if (responseObject.errorCode !== 0) {
    console.log("Connection Lost: " + responseObject.errorMessage);
  }
};

client.onMessageArrived = async (message) => {
  try {
    const data = JSON.parse(message.payloadString);
    console.log('Received message on topic [' + message.destinationName + ']:', data);
    
    // Save temperature and humidity data to database
    if (data.temperature !== undefined && data.humidity !== undefined) {
      const connection = await db.getConnection();
      const query = 'INSERT INTO DHT22 (temperature, humidity) VALUES (?, ?)';
      await connection.query(query, [data.temperature, data.humidity]);
      connection.release();
      console.log('Temperature and humidity data saved to database');
    }
    
    // Save light sensor data to BH1370 table
    if (message.destinationName === "myapp/greenhouse" && data.light_value !== undefined) {
      const connection = await db.getConnection();
      const query = 'INSERT INTO BH1370 (light_intensity) VALUES (?)';
      await connection.query(query, [data.light_value]);
      connection.release();
      console.log('Light intensity data saved to BH1370 table:', data.light_value);
    }
  } catch (error) {
    console.error('Error processing message:', error);
  }
};

client.connect({
  onSuccess: () => {
    console.log("MQTT Connected");
    client.subscribe("dht22");
    client.subscribe("myapp/greenhouse"); // Topic duy nhất cho dữ liệu từ thiết bị
    console.log("Subscribed to topics: dht22, myapp/greenhouse");
    initializeDatabase();
  },
  onFailure: (err) => {
    console.log("MQTT Connection failed:", err);
  }
});

// Routes
app.use('/api', readingRoutes);
app.use('/auth', authRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});