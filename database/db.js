const { createClient } = require('@libsql/client');
const bcrypt = require('bcryptjs');

// ==========================================
// إنشاء عميل Turso
// ==========================================
const db = createClient({
  url: process.env.TURSO_DATABASE_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ==========================================
// دالة مساعدة لتنفيذ أوامر SQL
// ==========================================
async function execute(sql, params = []) {
  const result = await db.execute({ sql, args: params });
  return result;
}

// ==========================================
// إنشاء الجداول
// ==========================================
async function initDatabase() {
  await execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('teacher', 'admin')),
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await execute(`
    CREATE TABLE IF NOT EXISTS bookings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      teacher_name TEXT NOT NULL,
      grade TEXT NOT NULL,
      subject TEXT NOT NULL,
      lesson_title TEXT NOT NULL,
      needs TEXT NOT NULL,
      day TEXT NOT NULL,
      period INTEGER NOT NULL CHECK(period BETWEEN 1 AND 8),
      booking_date TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(booking_date, period)
    )
  `);

  const adminResult = await execute('SELECT * FROM users WHERE role = ?', ['admin']);
  
  if (adminResult.rows.length === 0) {
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const adminUsername = process.env.ADMIN_USERNAME || 'admin';
    const hashedPassword = bcrypt.hashSync(adminPassword, 10);

    await execute(
      'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
      [adminUsername, hashedPassword, 'admin']
    );

    console.log('✅ تم إنشاء حساب المسؤول الافتراضي');
    console.log('   اسم المستخدم:', adminUsername);
    console.log('   كلمة المرور:', adminPassword);
  }
}

module.exports = {
  db,
  execute,
  initDatabase,
  prepare: (sql) => ({
    get: async (...params) => {
      const result = await execute(sql, params);
      return result.rows[0];
    },
    all: async (...params) => {
      const result = await execute(sql, params);
      return result.rows;
    },
    run: async (...params) => {
      const result = await execute(sql, params);
      return {
        lastInsertRowid: Number(result.lastInsertRowid),
        changes: result.rowsAffected
      };
    }
  })
};