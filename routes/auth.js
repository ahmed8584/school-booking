const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../database/db');

const router = express.Router();

// ==========================================
// صفحة تسجيل الدخول
// ==========================================
router.get('/login', (req, res) => {
  res.render('login', { error: null });
});

// ==========================================
// معالجة تسجيل الدخول
// ==========================================
router.post('/login', async (req, res) => {
  try {
    const { username, password, role } = req.body;

    if (!username || !password || !role) {
      return res.render('login', { error: 'الرجاء إدخال جميع البيانات' });
    }

    // ==========================================
    // دخول المسؤول
    // ==========================================
    if (role === 'admin') {
      const expectedUser = process.env.ADMIN_USERNAME || 'admin';
      const expectedPass = process.env.ADMIN_PASSWORD || 'admin123';

      if (username === expectedUser && password === expectedPass) {
        req.session.user = {
          role: 'admin',
          username: expectedUser
        };
        return res.redirect('/admin');
      } else {
        return res.render('login', { error: 'بيانات المسؤول غير صحيحة' });
      }
    }

    // ==========================================
    // دخول المعلم
    // ==========================================
    if (role === 'teacher') {
      const teacherPassword = process.env.TEACHER_PASSWORD || 'teacher123';

      if (password !== teacherPassword) {
        return res.render('login', { error: 'كلمة المرور غير صحيحة' });
      }

      // البحث عن المستخدم
      const result = await db.execute(
        'SELECT * FROM users WHERE username = ? AND role = ?',
        [username, 'teacher']
      );

      let user = result.rows[0];

      if (!user) {
        // إنشاء حساب معلم جديد
        const hashedPassword = bcrypt.hashSync(password, 10);
        const insertResult = await db.execute(
          'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
          [username, hashedPassword, 'teacher']
        );

        user = {
          id: Number(insertResult.lastInsertRowid),
          username,
          role: 'teacher'
        };
      }

      req.session.user = {
        id: user.id,
        username: user.username,
        role: 'teacher'
      };
      return res.redirect('/teacher');
    }

    return res.render('login', { error: 'نوع المستخدم غير معروف' });
  } catch (error) {
    console.error('خطأ في تسجيل الدخول:', error);
    return res.render('login', { error: 'حدث خطأ في السيرفر' });
  }
});

// ==========================================
// تسجيل الخروج
// ==========================================
router.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

module.exports = router;