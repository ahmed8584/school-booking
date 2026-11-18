// ==========================================
// تحميل الإعدادات من ملف .env
// ==========================================
require('dotenv').config();

// ==========================================
// استيراد المكتبات
// ==========================================
const express = require('express');
const session = require('express-session');
const path = require('path');

// ==========================================
// استيراد قاعدة البيانات
// ==========================================
const { initDatabase } = require('./database/db');

initDatabase()
  .then(() => console.log('✅ قاعدة البيانات جاهزة'))
  .catch(err => console.error('❌ خطأ في تهيئة قاعدة البيانات:', err));

// ==========================================
// استيراد المسارات
// ==========================================
const authRoutes = require('./routes/auth');
const bookingRoutes = require('./routes/bookings');
// ==========================================
// إنشاء التطبيق
// ==========================================
const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// إعدادات الوسيطات
// ==========================================
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ==========================================
// إعداد الجلسات
// ==========================================
app.use(session({
  secret: process.env.SESSION_SECRET || 'secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    maxAge: 1000 * 60 * 60 * 8,
    httpOnly: true
  }
}));

// ==========================================
// الملفات الثابتة
// ==========================================
app.use(express.static(path.join(__dirname, 'public')));

// ==========================================
// إعداد محرك القوالب
// ==========================================
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ==========================================
// دالة التحقق من تسجيل الدخول
// ==========================================
function requireLogin(role = null) {
  return (req, res, next) => {
    if (!req.session.user) {
      return res.redirect('/login');
    }
    if (role && req.session.user.role !== role) {
      return res.redirect('/login');
    }
    next();
  };
}

// ==========================================
// الصفحة الرئيسية → تحويل لصفحة الدخول
// ==========================================
app.get('/', (req, res) => {
  res.redirect('/login');
});

// ==========================================
// مسارات المصادقة
// ==========================================
app.use('/', authRoutes);
app.use('/api/bookings', bookingRoutes);
// ==========================================
// صفحة المعلم (محمية)
// ==========================================
app.get('/teacher', requireLogin('teacher'), (req, res) => {
  res.render('teacher', { user: req.session.user });
});

// ==========================================
// صفحة المسؤول (محمية)
// ==========================================
app.get('/admin', requireLogin('admin'), (req, res) => {
  res.render('admin', { user: req.session.user });
});

// ==========================================
// تشغيل السيرفر
// ==========================================
app.listen(PORT, () => {
  console.log('');
  console.log('==========================================');
  console.log('🚀 السيرفر يعمل الآن!');
  console.log(`🌐 افتح المتصفح على: http://localhost:${PORT}`);
  console.log('==========================================');
  console.log('');
});