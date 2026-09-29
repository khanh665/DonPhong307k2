const Schedule = require('../models/Schedule');
const Setting = require('../models/Setting');
const EmailService = require('./emailService');

class SchedulerService {
  static timer = null;
  static isChecking = false;

  /**
   * Khởi động tiến trình chạy ngầm trong ứng dụng
   */
  static start() {
    if (this.timer) return;

    console.log('⏰ [SchedulerService] Đã bật tiến trình theo dõi lịch tự động mỗi phút.');
    // Kiểm tra ngay khi khởi động
    this.checkAndSendToday(false);

    // Chạy định kỳ mỗi 60 giây
    this.timer = setInterval(() => {
      this.tick();
    }, 60 * 1000);
  }

  static stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  static async tick() {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      const settings = Setting.getAll();
      const reminderTime = settings.reminder_time || '07:00'; // HH:mm

      const now = new Date();
      const currentH = String(now.getHours()).padStart(2, '0');
      const currentM = String(now.getMinutes()).padStart(2, '0');
      const currentTime = `${currentH}:${currentM}`;

      // Nếu đã đến hoặc quá giờ gửi và hôm nay chưa gửi thành công
      if (currentTime >= reminderTime) {
        await this.checkAndSendToday(false);
      }
    } catch (err) {
      console.error('[SchedulerService] Lỗi trong tiến trình kiểm tra:', err.message);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Kiểm tra lịch hôm nay và gửi email nhắc việc
   * @param {boolean} isForce - Bỏ qua kiểm tra giờ và trạng thái đã gửi để gửi lại ngay
   */
  static async checkAndSendToday(isForce = false) {
    const todaySchedule = Schedule.getTodaySchedule();
    if (!todaySchedule) {
      console.log('[SchedulerService] Hôm nay chưa có lịch phân công được sinh.');
      return { success: false, message: 'Hôm nay chưa có lịch phân công trong hệ thống.' };
    }

    if (!isForce && todaySchedule.email_status === 'sent') {
      return { success: true, message: 'Email nhắc việc hôm nay đã được gửi thành công trước đó.' };
    }

    console.log(`[SchedulerService] 🚀 Đang gửi email nhắc việc cho ${todaySchedule.member_name} (${todaySchedule.member_email})...`);
    const result = await EmailService.sendScheduleReminder(todaySchedule, isForce);
    return result;
  }
}

module.exports = SchedulerService;
