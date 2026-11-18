// ==========================================
// متغيرات عامة
// ==========================================
let weekData = [];
let currentStartDate = null;
let lastBookingData = null; // لحفظ بيانات آخر حجز

// ==========================================
// جلب حجوزات الأسبوع
// ==========================================
async function loadWeek(startDate = null) {
  try {
    const url = startDate
      ? `/api/bookings/week?start=${startDate}`
      : '/api/bookings/week';

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      showToast(data.error, true);
      return;
    }

    weekData = data.days;
    currentStartDate = data.startDate;
    renderDays();
    updateWeekHeader();
  } catch (error) {
    console.error(error);
    showToast('خطأ في تحميل البيانات', true);
  }
}

// ==========================================
// عرض الأيام والحصص
// ==========================================
function renderDays() {
  const container = document.getElementById('daysContainer');
  container.innerHTML = '';

  weekData.forEach(day => {
    const dayCard = document.createElement('div');
    dayCard.className = 'day-card';

    const header = document.createElement('div');
    header.className = 'day-header';
    header.innerHTML = `
      <h3>📅 ${day.name}</h3>
      <span class="day-date">${day.dateFormatted}</span>
    `;
    dayCard.appendChild(header);

    const grid = document.createElement('div');
    grid.className = 'periods-grid';

    day.periods.forEach(p => {
      const btn = document.createElement('button');
      btn.className = 'period-btn';

      if (p.booked) {
        btn.classList.add('booked');
        btn.disabled = true;
        btn.innerHTML = `
          <strong>الحصة ${p.period}</strong>
          <span>🔒 محجوز</span>
        `;
      } else {
        btn.innerHTML = `
          <strong>الحصة ${p.period}</strong>
          <span>✅ متاح</span>
        `;
        btn.addEventListener('click', () => openModal(day, p.period));
      }

      grid.appendChild(btn);
    });

    dayCard.appendChild(grid);
    container.appendChild(dayCard);
  });
}

// ==========================================
// تحديث عنوان الأسبوع
// ==========================================
function updateWeekHeader() {
  if (!weekData.length) return;
  const start = weekData[0].dateFormatted;
  const end = weekData[weekData.length - 1].dateFormatted;
  document.getElementById('weekRange').textContent = `${start} - ${end}`;
}

// ==========================================
// التنقل بين الأسابيع
// ==========================================
function goToPreviousWeek() {
  const newDate = new Date(currentStartDate + 'T00:00:00');
  newDate.setDate(newDate.getDate() - 7);
  loadWeek(formatDateStr(newDate));
}

function goToNextWeek() {
  const newDate = new Date(currentStartDate + 'T00:00:00');
  newDate.setDate(newDate.getDate() + 7);
  loadWeek(formatDateStr(newDate));
}

function goToToday() {
  loadWeek();
}

function formatDateStr(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// ==========================================
// فتح نافذة الحجز
// ==========================================
function openModal(day, period) {
  document.getElementById('bookingDay').value = day.name;
  document.getElementById('bookingPeriod').value = period;
  document.getElementById('bookingDate').value = day.date;

  const teacherName = document.querySelector('.user-info span').textContent
    .replace('مرحباً، ', '').trim();
  document.getElementById('teacherName').value = teacherName;

  document.getElementById('bookingModal').style.display = 'flex';
}

// ==========================================
// إغلاق نافذة الحجز
// ==========================================
function closeModal() {
  document.getElementById('bookingModal').style.display = 'none';
  document.getElementById('bookingForm').reset();
}

// ==========================================
// إرسال الحجز (حفظ في الموقع)
// ==========================================
document.getElementById('bookingForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  // تم تعديل هذا الجزء ليتوافق مع القائمة المنسدلة للمادة (subject)
  const bookingData = {
    teacher_name: document.getElementById('teacherName').value,
    grade: document.getElementById('grade').value,
    subject: document.getElementById('subject').value, // سيأخذ القيمة من الـ select
    lesson_title: document.getElementById('lessonTitle').value,
    needs: document.getElementById('needs').value,
    email: document.getElementById('email').value,
    day: document.getElementById('bookingDay').value,
    period: parseInt(document.getElementById('bookingPeriod').value),
    booking_date: document.getElementById('bookingDate').value
  };

  try {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bookingData)
    });

    const data = await response.json();

    if (data.error) {
      showToast(data.error, true);
      return;
    }

    // ✅ الحجز نجح
    showToast('✅ تم الحجز بنجاح!');

    // نحفظ بيانات الحجز للاستخدام في الواتساب
    lastBookingData = bookingData;

    // نغلق نافذة الحجز
    closeModal();

    // نحدّث الأيام
    loadWeek(currentStartDate);

    // نفتح نافذة خيار واتساب
    document.getElementById('whatsappChoiceModal').style.display = 'flex';

  } catch (error) {
    console.error(error);
    showToast('خطأ في الاتصال بالسيرفر', true);
  }
});

// ==========================================
// إغلاق نافذة خيار الواتساب
// ==========================================
function closeWhatsappChoice() {
  document.getElementById('whatsappChoiceModal').style.display = 'none';
  lastBookingData = null;
}

// ==========================================
// عرض نافذة إدخال رقم الواتساب
// ==========================================
function showPhoneInput() {
  document.getElementById('whatsappChoiceModal').style.display = 'none';
  document.getElementById('whatsappNumber').value = '';
  document.getElementById('whatsappPhoneModal').style.display = 'flex';
}

// ==========================================
// إغلاق نافذة إدخال الرقم
// ==========================================
function closeWhatsappPhone() {
  document.getElementById('whatsappPhoneModal').style.display = 'none';
  lastBookingData = null;
}

// ==========================================
// إرسال عبر واتساب
// ==========================================
function sendToWhatsApp() {
  const phoneInput = document.getElementById('whatsappNumber').value.trim();

  if (!phoneInput) {
    alert('⚠️ الرجاء إدخال رقم الواتساب');
    return;
  }

  const phone = phoneInput.replace(/[^0-9]/g, '');

  if (phone.length < 8 || phone.length > 15) {
    alert('⚠️ الرجاء إدخال رقم صحيح (مثال: 96891234567)');
    return;
  }

  if (!lastBookingData) {
    alert('⚠️ لا توجد بيانات حجز');
    return;
  }

  const message =
    `*تأكيد حجز قاعة المصادر التعليمية*\n\n` +
    `👨‍🏫 *المعلم:* ${lastBookingData.teacher_name}\n` +
    `🏫 *الصف:* ${lastBookingData.grade}\n` +
    `📖 *المادة:* ${lastBookingData.subject}\n` +
    `📝 *عنوان الدرس:* ${lastBookingData.lesson_title}\n` +
    `🔧 *الاحتياجات:* ${lastBookingData.needs}\n` +
    `📅 *اليوم:* ${lastBookingData.day}\n` +
    `📆 *التاريخ:* ${lastBookingData.booking_date}\n` +
    `⏰ *الحصة:* ${lastBookingData.period}`;

  const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

  window.open(whatsappUrl, '_blank');

  // نغلق النافذة
  document.getElementById('whatsappPhoneModal').style.display = 'none';
  lastBookingData = null;
}

// ==========================================
// إشعار Toast
// ==========================================
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.className = 'toast' + (isError ? ' error' : '');
  toast.style.display = 'block';

  setTimeout(() => {
    toast.style.display = 'none';
  }, 3000);
}

// ==========================================
// [جديد] تصفية التقارير حسب المادة
// ==========================================
function filterReports() {
  // جلب المادة المختارة من القائمة المنسدلة في قسم التقارير
  const selectedSubject = document.getElementById('searchSubject').value;
  
  // جلب جميع صفوف التقارير (تأكد أن صفوف الجدول في teacher.ejs تحمل الكلاس 'booking-row')
  const rows = document.querySelectorAll('.booking-row');
  
  rows.forEach(row => {
    // جلب الخلية التي تحتوي على اسم المادة (تأكد أن الخلية تحمل الكلاس 'subject-cell')
    const subjectCell = row.querySelector('.subject-cell');
    
    if (subjectCell) {
      const rowSubject = subjectCell.innerText.trim();
      
      // إذا اختار "الكل" أو كانت المادة مطابقة، أظهر الصف، وإلا أخفه
      if (selectedSubject === 'all' || rowSubject === selectedSubject) {
        row.style.display = ''; 
      } else {
        row.style.display = 'none';
      }
    }
  });
}

// ==========================================
// تحميل البيانات
// ==========================================
document.addEventListener('DOMContentLoaded', () => loadWeek());