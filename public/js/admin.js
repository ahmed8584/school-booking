// ==========================================
// متغيرات عامة
// ==========================================
let allBookings = [];

// ==========================================
// جلب كل الحجوزات
// ==========================================
async function loadBookings(month = null) {
  try {
    const url = month
      ? `/api/bookings/month/${month}`
      : '/api/bookings/all';

    const response = await fetch(url);
    const data = await response.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    allBookings = data.bookings;
    renderBookings();
  } catch (error) {
    console.error(error);
    alert('خطأ في تحميل البيانات');
  }
}

// ==========================================
// عرض الحجوزات في الجدول
// ==========================================
function renderBookings() {
  const tbody = document.getElementById('bookingsBody');

  if (allBookings.length === 0) {
    tbody.innerHTML = `
      <tr><td colspan="10" style="text-align:center; padding:30px;">
        📭 لا توجد حجوزات
      </td></tr>
    `;
    return;
  }

  // ✅ تعديل: إضافة كلاس "booking-row" للصفوف وتحديد خلية المادة لتعمل مع البحث
  tbody.innerHTML = allBookings.map((b, index) => `
    <tr class="booking-row">
      <td>${index + 1}</td>
      <td>${formatDate(b.booking_date)}</td>
      <td>${b.day}</td>
      <td>الحصة ${b.period}</td>
      <td>${b.teacher_name}</td>
      <td>${b.grade}</td>
      <td class="subject-cell">${b.subject}</td> <!-- خلية المادة محددة هنا -->
      <td>${b.lesson_title}</td>
      <td>${b.needs}</td>
      <td>
        <button class="btn-delete" onclick="deleteBooking(${b.id})">
          🗑️ حذف
        </button>
      </td>
    </tr>
  `).join('');
}

// ==========================================
// حذف حجز
// ==========================================
async function deleteBooking(id) {
  if (!confirm('هل أنت متأكد من حذف هذا الحجز؟')) return;

  try {
    const response = await fetch(`/api/bookings/${id}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (data.error) {
      alert(data.error);
      return;
    }

    alert('✅ تم الحذف بنجاح');
    loadBookings(getCurrentMonthFilter());
  } catch (error) {
    console.error(error);
    alert('خطأ في الحذف');
  }
}

// ==========================================
// تنسيق التاريخ
// ==========================================
function formatDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return `${day}/${month}/${year}`;
}

// ==========================================
// جلب فلتر الشهر الحالي
// ==========================================
function getCurrentMonthFilter() {
  const select = document.getElementById('reportMonth');
  return select.value || null;
}

// ==========================================
// تعبئة قائمة الشهور
// ==========================================
function fillMonthsList() {
  const select = document.getElementById('reportMonth');
  const arabicMonths = [
    'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
    'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
  ];

  const today = new Date();
  const currentYear = today.getFullYear();

  [currentYear, currentYear - 1].forEach(year => {
    arabicMonths.forEach((name, index) => {
      const monthNum = String(index + 1).padStart(2, '0');
      const value = `${year}-${monthNum}`;
      const option = document.createElement('option');
      option.value = value;
      option.textContent = `${name} ${year}`;
      select.appendChild(option);
    });
  });

  const currentMonth = `${currentYear}-${String(today.getMonth() + 1).padStart(2, '0')}`;
  select.value = currentMonth;
}

// ==========================================
// طباعة التقرير الشهري
// ==========================================
document.getElementById('printBtn').addEventListener('click', () => {
  const month = document.getElementById('reportMonth').value;

  if (!month) {
    alert('الرجاء اختيار الشهر أولاً');
    return;
  }

  const printTitle = document.createElement('h2');
  printTitle.id = 'printTitle';
  printTitle.style.textAlign = 'center';
  printTitle.style.marginBottom = '20px';
  printTitle.textContent = `تقرير حجوزات شهر ${month}`;
  document.body.insertBefore(printTitle, document.body.firstChild);

  window.print();

  setTimeout(() => {
    const el = document.getElementById('printTitle');
    if (el) el.remove();
  }, 1000);
});

// ==========================================
// فلترة حسب الشهر
// ==========================================
document.getElementById('reportMonth').addEventListener('change', (e) => {
  const month = e.target.value;
  // عند تغيير الشهر، نعيد ضبط فلتر المادة إلى "الكل" لضمان عدم تداخل الفلاتر
  const subjectFilter = document.getElementById('searchSubject');
  if (subjectFilter) subjectFilter.value = 'all';
  
  loadBookings(month || null);
});

// ==========================================
// [جديد] فلترة الجدول حسب المادة
// ==========================================
function filterBySubject() {
  const selectedSubject = document.getElementById('searchSubject').value;
  const rows = document.querySelectorAll('.booking-row');

  rows.forEach(row => {
    const subjectCell = row.querySelector('.subject-cell');
    if (subjectCell) {
      const rowSubject = subjectCell.innerText.trim();
      
      // إذا اختار "الكل" أو كانت المادة مطابقة، أظهر الصف
      if (selectedSubject === 'all' || rowSubject === selectedSubject) {
        row.style.display = '';
      } else {
        row.style.display = 'none';
      }
    }
  });
}

// ==========================================
// تحميل الصفحة
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  fillMonthsList();
  loadBookings(getCurrentMonthFilter());
});