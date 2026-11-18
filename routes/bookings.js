const express = require('express');
const db = require('../database/db');
const { sendBookingConfirmation } = require('../utils/mailer');

const router = express.Router();

// ==========================================
// دالة التحقق من تسجيل الدخول
// ==========================================
function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({ error: 'غير مسجل دخول' });
  }
  next();
}

// ==========================================
// أسماء الأيام
// ==========================================
const DAYS = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس'];

// ==========================================
// جلب حجوزات أسبوع معين (أو الأسبوع الحالي)
// ==========================================
router.get('/week', requireLogin, async (req, res) => {
  try {
    let startOfWeek;

    if (req.query.start) {
      startOfWeek = new Date(req.query.start + 'T00:00:00');
    } else {
      const today = new Date();
      const currentDay = today.getDay();
      startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - currentDay);
    }
    startOfWeek.setHours(0, 0, 0, 0);

    const weekDays = [];

    for (let index = 0; index < DAYS.length; index++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + index);

      const dateStr = formatDateStr(date);

      const result = await db.execute(
        'SELECT * FROM bookings WHERE booking_date = ?',
        [dateStr]
      );

      const bookings = result.rows;

      const periods = [];
      for (let p = 1; p <= 8; p++) {
        const booking = bookings.find(b => b.period === p);
        periods.push({
          period: p,
          booked: !!booking,
          booking: booking || null
        });
      }

      weekDays.push({
        name: DAYS[index],
        date: dateStr,
        dateFormatted: formatArabicDate(date),
        periods
      });
    }

    res.json({
      days: weekDays,
      startDate: formatDateStr(startOfWeek)
    });
  } catch (error) {
    console.error('خطأ في جلب الأسبوع:', error);
    res.status(500).json({ error: 'خطأ في جلب البيانات' });
  }
});

// ==========================================
// إنشاء حجز جديد
// ==========================================
router.post('/', requireLogin, async (req, res) => {
  try {
    const {
      teacher_name,
      grade,
      subject,
      lesson_title,
      needs,
      day,
      period,
      booking_date,
      email
    } = req.body;

    if (!teacher_name || !grade || !subject || !lesson_title || !needs || !day || !period || !booking_date) {
      return res.status(400).json({ error: 'جميع الحقول مطلوبة' });
    }

    const existingResult = await db.execute(
      'SELECT * FROM bookings WHERE booking_date = ? AND period = ?',
      [booking_date, period]
    );

    if (existingResult.rows.length > 0) {
      return res.status(409).json({ error: 'هذه الحصة محجوزة بالفعل' });
    }

    const result = await db.execute(
      `INSERT INTO bookings 
       (user_id, teacher_name, grade, subject, lesson_title, needs, day, period, booking_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.session.user.id || 1,
        teacher_name,
        grade,
        subject,
        lesson_title,
        needs,
        day,
        period,
        booking_date
      ]
    );

    if (email) {
      sendBookingConfirmation(email, {
        teacher_name,
        grade,
        subject,
        lesson_title,
        needs,
        day,
        period,
        booking_date
      }).catch(err => console.error('خطأ في الإيميل:', err));
    }

    res.json({
      success: true,
      message: 'تم الحجز بنجاح',
      bookingId: Number(result.lastInsertRowid)
    });
  } catch (error) {
    console.error('خطأ في حفظ الحجز:', error);
    res.status(500).json({ error: 'خطأ في حفظ الحجز' });
  }
});

// ==========================================
// جلب كل الحجوزات (للمسؤول)
// ==========================================
router.get('/all', requireLogin, async (req, res) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'غير مصرح' });
    }

    const result = await db.execute(
      'SELECT * FROM bookings ORDER BY booking_date DESC, period ASC'
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('خطأ في جلب الحجوزات:', error);
    res.status(500).json({ error: 'خطأ في جلب الحجوزات' });
  }
});

// ==========================================
// جلب حجوزات شهر معين
// ==========================================
router.get('/month/:month', requireLogin, async (req, res) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'غير مصرح' });
    }

    const { month } = req.params;
    const result = await db.execute(
      'SELECT * FROM bookings WHERE booking_date LIKE ? ORDER BY booking_date ASC, period ASC',
      [`${month}%`]
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('خطأ في جلب البيانات:', error);
    res.status(500).json({ error: 'خطأ في جلب البيانات' });
  }
});

// ==========================================
// حذف حجز (للمسؤول فقط)
// ==========================================
router.delete('/:id', requireLogin, async (req, res) => {
  try {
    if (req.session.user.role !== 'admin') {
      return res.status(403).json({ error: 'غير مصرح' });
    }

    const { id } = req.params;
    const result = await db.execute('DELETE FROM bookings WHERE id = ?', [id]);

    if (result.rowsAffected === 0) {
      return res.status(404).json({ error: 'الحجز غير موجود' });
    }

    res.json({ success: true, message: 'تم الحذف بنجاح' });
  } catch (error) {
    console.error('خطأ في الحذف:', error);
    res.status(500).json({ error: 'خطأ في الحذف' });
  }
});

// ==========================================
// دالة تنسيق التاريخ (YYYY-MM-DD)
// ==========================================
function formatDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ==========================================
// دالة تنسيق التاريخ بالعربي
// ==========================================
function formatArabicDate(date) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

module.exports = router;