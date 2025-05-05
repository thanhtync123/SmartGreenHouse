// Script tạo tài khoản test
require('dotenv').config({ path: '../.env' });
const bcrypt = require('bcryptjs');
const db = require('../config/database');

async function createTestUser() {
  try {
    // Thông tin tài khoản test
    const username = 'test';
    const password = 'test123';
    const email = 'test@example.com';
    const role = 'user';

    // Mã hóa mật khẩu
    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Kết nối database
    const connection = await db.getConnection();
    
    // Kiểm tra xem user đã tồn tại chưa
    const [existingUsers] = await connection.query('SELECT * FROM users WHERE username = ?', [username]);
    
    if (existingUsers.length > 0) {
      console.log(`Tài khoản '${username}' đã tồn tại.`);
      connection.release();
      return;
    }
    
    // Thêm tài khoản mới vào cơ sở dữ liệu
    await connection.query(
      'INSERT INTO users (username, password, email, role) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, email, role]
    );
    
    connection.release();
    console.log(`Đã tạo tài khoản test thành công:
- Username: ${username}
- Password: ${password}
- Role: ${role}`);
    
  } catch (error) {
    console.error('Lỗi khi tạo tài khoản test:', error);
  } finally {
    process.exit();
  }
}

createTestUser();