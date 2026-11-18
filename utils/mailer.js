const nodemailer = require('nodemailer');

// ==========================================
// إنشاء المُرسِل (Outlook)
// ==========================================
function createTransporter() {
  return nodemailer.createTransport({
    host: "smtp-mail.outlook.com",
    port: 587,
    secure: false,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    },
    tls: {
      ciphers: "SSLv3",
      rejectUnauthorized: false
    }
  });
}

// ==========================================
// إرسال إيميل تأكيد الحجز
// ==========================================
async function sendBookingConfirmation(toEmail, booking) {
  if (!toEmail) {
    console.log('⚠️ لا يوجد إيميل، تم تخطي الإرسال');
    return { success: false, message: 'لا يوجد إيميل' };
  }

  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.log('⚠️ إعدادات الإيميل غير مكتملة في .env');
    return { success: false, message: 'إعدادات الإيميل غير مكتملة' };
  }

  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: `"حجز قاعة المصادر" <${process.env.EMAIL_USER}>`,
      to: toEmail,
      subject: '✅ تأكيد حجز قاعة المصادر التعليمية',
      html: `
        <div style="font-family: 'Segoe UI', Tahoma, Arial; direction: rtl; max-width: 600px; margin: 0 auto; background: #f7fafc; padding: 20px; border-radius: 10px;">
          <div style="background: linear-gradient(135deg, #667eea, #764ba2); color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="margin: 0;">📚 تأكيد الحجز</h1>
            <p style="margin: 5px 0 0;">قاعة المصادر التعليمية</p>
          </div>
          
          <div style="background: white; padding: 25px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 1.1em;">عزيزي المعلم <strong>${booking.teacher_name}</strong>،</p>
            <p>تم تأكيد حجزك في قاعة المصادر التعليمية بنجاح. تفاصيل الحجز:</p>
            
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <tr>
                <td style="padding: 10px; background: #f7fafc; border: 1px solid #e2e8f0;"><strong>📅 اليوم</strong></td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${booking.day}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #f7fafc; border: 1px solid #e2e8f0;"><strong>📆 التاريخ</strong></td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${booking.booking_date}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #f7fafc; border: 1px solid #e2e8f0;"><strong>⏰ الحصة</strong></td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">الحصة ${booking.period}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #f7fafc; border: 1px solid #e2e8f0;"><strong>🏫 الصف</strong></td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${booking.grade}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #f7fafc; border: 1px solid #e2e8f0;"><strong>📖 المادة</strong></td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${booking.subject}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #f7fafc; border: 1px solid #e2e8f0;"><strong>📝 عنوان الدرس</strong></td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${booking.lesson_title}</td>
              </tr>
              <tr>
                <td style="padding: 10px; background: #f7fafc; border: 1px solid #e2e8f0;"><strong>🔧 الاحتياجات</strong></td>
                <td style="padding: 10px; border: 1px solid #e2e8f0;">${booking.needs}</td>
              </tr>
            </table>

            <p style="color: #718096; font-size: 0.9em; text-align: center; margin-top: 30px;">
              ⚠️ هذا إيميل تلقائي، الرجاء عدم الرد عليه.
            </p>
          </div>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ تم إرسال الإيميل:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ خطأ في إرسال الإيميل:', error.message);
    return { success: false, message: error.message };
  }
}

module.exports = { sendBookingConfirmation };