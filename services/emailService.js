const nodemailer = require('nodemailer');
const Setting = require('../models/Setting');
const EmailLog = require('../models/EmailLog');
const Schedule = require('../models/Schedule');

class EmailService {
  /**
   * Tạo nội dung HTML cho email nhắc nhở vệ sinh
   */
  static generateEmailHtml({ memberName, dateStr, dayOfWeekStr, reminderTime, roomName }) {
    return `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Nhắc lịch vệ sinh phòng trọ</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; margin: 0; padding: 20px; color: #1e293b; }
        .email-container { max-width: 540px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
        .email-header { background: linear-gradient(135deg, #4f46e5, #4338ca); color: #ffffff; padding: 28px 24px; text-align: center; }
        .email-header h1 { margin: 0; font-size: 20px; font-weight: 800; letter-spacing: -0.02em; }
        .email-header p { margin: 6px 0 0 0; opacity: 0.9; font-size: 13px; }
        .email-body { padding: 24px; }
        .greeting { font-size: 16px; font-weight: 700; margin-bottom: 12px; color: #0f172a; }
        .alert-card { background: #f8fafc; border: 2px solid #e2e8f0; border-radius: 12px; padding: 18px; margin: 16px 0; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px dashed #e2e8f0; font-size: 14px; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #64748b; font-weight: 500; }
        .info-value { color: #0f172a; font-weight: 700; }
        .status-badge { display: inline-block; background: #fef3c7; color: #b45309; padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
        .checklist-box { background: #eff6ff; border-left: 4px solid #3b82f6; padding: 12px 16px; margin: 16px 0; border-radius: 0 8px 8px 0; font-size: 13px; color: #1e40af; line-height: 1.6; }
        .checklist-box ul { margin: 6px 0 0 16px; padding: 0; }
        .email-footer { text-align: center; padding: 18px 24px; font-size: 12px; color: #94a3b8; background: #f8fafc; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>🔔 NHẮC LỊCH VỆ SINH PHÒNG TRỌ</h1>
          <p>${roomName || 'Hệ thống Quản lý Vệ sinh Phòng trọ'}</p>
        </div>
        <div class="email-body">
          <div class="greeting">Xin chào ${memberName},</div>
          <p style="margin: 0; font-size: 14px; line-height: 1.5; color: #334155;">
            Hôm nay là ngày bạn được phân công phụ trách vệ sinh phòng trọ. Bạn hãy sắp xếp thời gian hợp lý trong ngày để hoàn thành nhé!
          </p>

          <div class="alert-card">
            <div class="info-row">
              <span class="info-label">🧹 Người phụ trách:</span>
              <span class="info-value">${memberName}</span>
            </div>
            <div class="info-row">
              <span class="info-label">📅 Ngày trực:</span>
              <span class="info-value">${dayOfWeekStr}, ${dateStr}</span>
            </div>
            <div class="info-row">
              <span class="info-label">⏰ Thời gian nhắc:</span>
              <span class="info-value">${reminderTime}</span>
            </div>
            <div class="info-row">
              <span class="info-label">📌 Trạng thái:</span>
              <span class="info-value"><span class="status-badge">Chưa hoàn thành</span></span>
            </div>
          </div>

          <div class="checklist-box">
            <strong>📋 Các đầu việc cần hoàn thành:</strong>
            <ul>
              <li>Quét & lau sạch sàn nhà và hành lang phòng</li>
              <li>Dọn rác, thay túi rác mới và đổ rác đúng nơi quy định</li>
              <li>Vệ sinh bồn rửa chén và khu vực bếp nấu</li>
              <li>Cọ rửa nhà tắm / nhà vệ sinh gọn gàng, sạch sẽ</li>
            </ul>
          </div>

          <p style="font-size: 13px; color: #64748b; margin-top: 16px;">
            Sau khi hoàn thành, vui lòng báo cho Trưởng phòng hoặc truy cập website để đánh dấu <strong>[Đã hoàn thành]</strong>. Cảm ơn bạn rất nhiều!
          </p>
        </div>
        <div class="email-footer">
          Email được gửi tự động từ Hệ thống Quản lý Vệ sinh Phòng trọ.<br>
          Vui lòng không trả lời trực tiếp email này.
        </div>
      </div>
    </body>
    </html>
    `;
  }

  static getVietnameseDayOfWeek(dateStr) {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    return days[dateObj.getDay()];
  }

  /**
   * Tạo Transporter Nodemailer dựa trên Cài đặt
   */
  static getTransporter(settings) {
    const host = settings.smtp_host || process.env.SMTP_HOST || 'smtp.gmail.com';
    const port = Number(settings.smtp_port) || Number(process.env.SMTP_PORT) || 587;
    const secure = String(settings.smtp_secure) === '1' || process.env.SMTP_SECURE === '1';
    const user = settings.smtp_user || process.env.SMTP_USER || '';
    const pass = settings.smtp_pass || process.env.SMTP_PASS || '';

    if (!user || !pass) {
      return null;
    }

    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: { rejectUnauthorized: false }
    });
  }

  /**
   * Gửi email qua Brevo REST API (HTTPS port 443 - không bao giờ bị chặn bởi Render)
   */
  static async sendEmailViaBrevo({ apiKey, fromName, fromEmail, toEmail, toName, subject, htmlContent }) {
    const url = 'https://api.brevo.com/v3/smtp/email';
    const payload = {
      sender: {
        name: fromName || 'Ban Quản Lý Phòng 307K2',
        email: fromEmail
      },
      to: [
        {
          email: toEmail,
          name: toName || toEmail
        }
      ],
      subject: subject,
      htmlContent: htmlContent
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'accept': 'application/json',
        'api-key': apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Brevo API Error (${res.status}): ${data.message || JSON.stringify(data)}`);
    }
    return { success: true, mode: 'brevo', messageId: data.messageId };
  }

  /**
   * Bộ điều hướng gửi email thông minh (Hỗ trợ Simulation -> Brevo HTTPS 443 -> SMTP 587/465)
   */
  static async dispatchEmail({ scheduleId = null, toEmail, toName = '', subject, htmlContent }) {
    const settings = Setting.getAll();
    const isSimulation = settings.email_mode === 'simulation';

    // 1. Chế độ giả lập
    if (isSimulation) {
      console.log(`[EmailService - SIMULATION] Đang giả lập gửi email tới: ${toEmail}`);
      EmailLog.create({
        schedule_id: scheduleId,
        recipient: toEmail,
        subject,
        status: 'sent',
        preview_content: htmlContent
      });

      if (scheduleId) {
        Schedule.updateEmailStatus(scheduleId, 'sent', new Date().toISOString());
      }

      return {
        success: true,
        mode: 'simulation',
        recipient: toEmail,
        subject,
        message: 'Đã gửi thành công (Chế độ Giả lập / Test). Xem lịch sử và preview trực tiếp trên web.'
      };
    }

    const brevoApiKey = settings.brevo_api_key || process.env.BREVO_API_KEY;
    const fromName = settings.smtp_from_name || 'Ban Quản Lý Phòng 307K2';
    const fromEmail = settings.smtp_from_email || settings.smtp_user || 'khanhva92@gmail.com';

    // 2. Ưu tiên Brevo REST API (Chạy qua HTTPS port 443, vượt mọi giới hạn chặn cổng của Render)
    if (brevoApiKey) {
      try {
        console.log(`[EmailService - Brevo API] Đang gửi tới ${toEmail} qua HTTPS...`);
        const result = await this.sendEmailViaBrevo({
          apiKey: brevoApiKey,
          fromName,
          fromEmail,
          toEmail,
          toName,
          subject,
          htmlContent
        });

        EmailLog.create({
          schedule_id: scheduleId,
          recipient: toEmail,
          subject,
          status: 'sent',
          preview_content: htmlContent
        });

        if (scheduleId) {
          Schedule.updateEmailStatus(scheduleId, 'sent', new Date().toISOString());
        }

        return {
          success: true,
          mode: 'brevo',
          messageId: result.messageId,
          recipient: toEmail,
          message: `Đã gửi email thật thành công qua Brevo API tới ${toEmail}!`
        };
      } catch (err) {
        console.error('[EmailService - Brevo ERROR]:', err.message);
        EmailLog.create({
          schedule_id: scheduleId,
          recipient: toEmail,
          subject,
          status: 'failed',
          error_message: err.message,
          preview_content: htmlContent
        });

        if (scheduleId) {
          Schedule.updateEmailStatus(scheduleId, 'failed');
        }

        return { success: false, error: err.message, recipient: toEmail };
      }
    }

    // 3. Gửi qua SMTP truyền thống (Gmail, port 587/465)
    if (!settings.smtp_user || !settings.smtp_pass) {
      return {
        success: false,
        need_config: true,
        message: 'Chưa cấu hình tài khoản gửi thư! Vui lòng vào Cài đặt nhập Gmail + Mật khẩu ứng dụng hoặc Brevo API Key.'
      };
    }

    try {
      const transporter = this.getTransporter(settings);
      if (!transporter) throw new Error('Chưa cấu hình tài khoản SMTP');

      const info = await transporter.sendMail({
        from: `"${fromName}" <${fromEmail}>`,
        to: toEmail,
        subject,
        html: htmlContent
      });

      console.log(`[EmailService - SMTP REAL] Đã gửi email tới ${toEmail}: ${info.messageId}`);

      EmailLog.create({
        schedule_id: scheduleId,
        recipient: toEmail,
        subject,
        status: 'sent',
        preview_content: htmlContent
      });

      if (scheduleId) {
        Schedule.updateEmailStatus(scheduleId, 'sent', new Date().toISOString());
      }

      return {
        success: true,
        mode: 'smtp',
        messageId: info.messageId,
        recipient: toEmail,
        message: `Đã gửi email thật thành công qua SMTP tới ${toEmail}!`
      };
    } catch (err) {
      let friendlyError = err.message;
      if (err.message.includes('ENETUNREACH') || err.message.includes('timeout') || err.code === 'ETIMEDOUT') {
        friendlyError = `Render Free chặn cổng SMTP 587 (${err.message}). Khắc phục: Nhập Brevo API Key trong Cài đặt (gửi qua HTTPS 443) hoặc chuyển sang Koyeb.`;
      }
      console.error(`[EmailService - SMTP ERROR]:`, friendlyError);

      EmailLog.create({
        schedule_id: scheduleId,
        recipient: toEmail,
        subject,
        status: 'failed',
        error_message: friendlyError,
        preview_content: htmlContent
      });

      if (scheduleId) {
        Schedule.updateEmailStatus(scheduleId, 'failed');
      }

      return { success: false, error: friendlyError, recipient: toEmail };
    }
  }

  /**
   * Gửi email tự động nhắc việc theo lịch cụ thể
   */
  static async sendScheduleReminder(schedule, isForce = false) {
    if (!schedule) {
      throw new Error('Lịch không tồn tại');
    }

    // Tránh gửi trùng email nhiều lần trong cùng 1 ngày (trừ khi cố tình bấm Gửi thử lại)
    if (!isForce && schedule.email_status === 'sent') {
      console.log(`[EmailService] Lịch ngày ${schedule.cleaning_date} đã gửi email trước đó, bỏ qua.`);
      return { success: true, alreadySent: true, message: 'Email hôm nay đã được gửi trước đó.' };
    }

    const settings = Setting.getAll();
    const [y, m, d] = schedule.cleaning_date.split('-');
    const formattedDate = `${d}/${m}/${y}`;
    const dayOfWeekStr = this.getVietnameseDayOfWeek(schedule.cleaning_date);
    const subject = `🔔 Nhắc lịch vệ sinh phòng trọ – ${formattedDate}`;

    const htmlContent = this.generateEmailHtml({
      memberName: schedule.member_name,
      dateStr: formattedDate,
      dayOfWeekStr,
      reminderTime: settings.reminder_time || '07:00',
      roomName: settings.room_name || 'Phòng trọ'
    });

    return await this.dispatchEmail({
      scheduleId: schedule.id,
      toEmail: schedule.member_email,
      toName: schedule.member_name,
      subject,
      htmlContent
    });
  }

  /**
   * Gửi email thử nghiệm (Test Connection)
   */
  static async sendTestEmail(targetEmail) {
    const settings = Setting.getAll();
    const subject = `🧪 Thử nghiệm kết nối Email - ${settings.room_name || 'Phòng trọ'}`;
    const htmlContent = `
      <div style="font-family: sans-serif; padding: 20px; color: #1e293b;">
        <h2 style="color: #4f46e5;">🎉 Chúc mừng! Kết nối Email hoạt động hoàn hảo!</h2>
        <p>Đây là email kiểm tra từ <strong>${settings.room_name || 'Hệ thống Quản lý Vệ sinh Phòng trọ'}</strong>.</p>
        <p>Hệ thống đã sẵn sàng tự động gửi thông báo lịch trực mỗi ngày cho các thành viên.</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <small style="color: #64748b;">Thời gian thử nghiệm: ${new Date().toLocaleString('vi-VN')}</small>
      </div>
    `;

    return await this.dispatchEmail({
      scheduleId: null,
      toEmail: targetEmail,
      toName: 'Thành viên kiểm tra',
      subject,
      htmlContent
    });
  }

  /**
   * Gửi email Ping nhắc việc ẩn danh từ bạn cùng phòng
   */
  static async sendAnonymousPing(schedule) {
    if (!schedule) {
      throw new Error('Không tìm thấy lịch hôm nay để gửi nhắc nhở');
    }

    const settings = Setting.getAll();
    const roomName = settings.room_name || 'Phòng 307K2 - KTX UTB';
    const [y, m, d] = schedule.cleaning_date.split('-');
    const formattedDate = `${d}/${m}/${y}`;
    const dayOfWeekStr = this.getVietnameseDayOfWeek(schedule.cleaning_date);
    const subject = `⚡ [Ẩn danh] Có bạn cùng phòng nhắc bạn dọn vệ sinh - ${roomName}`;

    const htmlContent = `
    <!DOCTYPE html>
    <html lang="vi">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Lời nhắc ẩn danh</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; margin: 0; padding: 20px; color: #1e293b; }
        .email-container { max-width: 520px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 16px rgba(0,0,0,0.08); border: 1px solid #e2e8f0; }
        .email-header { background: linear-gradient(135deg, #f59e0b, #ea580c); color: #ffffff; padding: 24px; text-align: center; }
        .email-header h1 { margin: 0; font-size: 20px; font-weight: 800; }
        .email-body { padding: 24px; }
        .greeting { font-size: 16px; font-weight: 700; color: #0f172a; margin-bottom: 12px; }
        .ping-quote { background: #fffbeb; border-left: 4px solid #f59e0b; padding: 14px 18px; border-radius: 0 10px 10px 0; margin: 16px 0; font-style: italic; color: #92400e; font-size: 15px; line-height: 1.5; }
        .anon-badge { display: inline-flex; align-items: center; gap: 6px; background: #f1f5f9; color: #475569; padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 700; margin-bottom: 12px; }
        .info-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px; margin: 16px 0; font-size: 14px; }
        .email-footer { text-align: center; padding: 16px; font-size: 12px; color: #94a3b8; background: #f8fafc; border-top: 1px solid #e2e8f0; }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="email-header">
          <h1>⚡ LỜI NHẮC VỆ SINH ẨN DANH</h1>
          <p style="margin: 4px 0 0 0; opacity: 0.9; font-size: 13px;">${roomName}</p>
        </div>
        <div class="email-body">
          <div class="anon-badge">🕵️ Tin nhắn từ: Thành viên ẩn danh trong phòng</div>
          <div class="greeting">Xin chào ${schedule.member_name},</div>
          <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">
            Một bạn cùng phòng vừa bấm nút <strong>Ping nhắc nhở ẩn danh</strong> trên website của phòng:
          </p>

          <div class="ping-quote">
            "Hôm nay (${dayOfWeekStr}, ${formattedDate}) là ngày phân công vệ sinh phòng của bạn đấy. Nếu bạn đang rảnh thì bớt chút thời gian quét dọn và đổ rác giúp cả phòng nhé! Cảm ơn bạn rất nhiều! ✨"
          </div>

          <div class="info-box">
            <div><strong>🧹 Người trực hôm nay:</strong> ${schedule.member_name}</div>
            <div><strong>📅 Ngày:</strong> ${dayOfWeekStr}, ${formattedDate}</div>
            <div><strong>📌 Trạng thái hiện tại:</strong> Chưa hoàn thành</div>
          </div>

          <p style="font-size: 13px; color: #64748b; line-height: 1.5;">
            🔒 <em>Danh tính người gửi hoàn toàn được giữ bí mật để giữ không khí sinh hoạt trong phòng luôn vui vẻ và thoải mái.</em>
          </p>

          <p style="font-size: 13px; color: #64748b; margin-top: 12px;">
            Sau khi dọn xong, bạn hãy truy cập web để đánh dấu <strong>[Đã hoàn thành]</strong> nhé!
          </p>
        </div>
        <div class="email-footer">
          Hệ thống Quản lý Vệ sinh - ${roomName}
        </div>
      </div>
    </body>
    </html>
    `;

    return await this.dispatchEmail({
      scheduleId: schedule.id,
      toEmail: schedule.member_email,
      toName: schedule.member_name,
      subject,
      htmlContent
    });
  }
}

module.exports = EmailService;
