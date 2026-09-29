const EmailService = require('../services/emailService');
const SchedulerService = require('../services/schedulerService');
const EmailLog = require('../models/EmailLog');
const Schedule = require('../models/Schedule');

exports.sendTodayReminder = async (req, res) => {
  try {
    const isForce = req.body.force === true || req.body.force === 'true';
    const result = await SchedulerService.checkAndSendToday(isForce);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendScheduleReminder = async (req, res) => {
  try {
    const { scheduleId } = req.params;
    const schedule = Schedule.getById(scheduleId);
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy lịch này' });
    }

    const result = await EmailService.sendScheduleReminder(schedule, true);
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendTestEmail = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp email nhận thử nghiệm' });
    }

    const result = await EmailService.sendTestEmail(email.trim());
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getLogs = (req, res) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const logs = EmailLog.getRecent(limit);
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.sendAnonymousPing = async (req, res) => {
  try {
    const todaySchedule = Schedule.getTodaySchedule();
    if (!todaySchedule) {
      return res.status(400).json({ success: false, message: 'Hôm nay chưa có lịch phân công để nhắc nhở.' });
    }

    if (todaySchedule.status === 'completed') {
      return res.status(400).json({ success: false, message: 'Bạn trực nhật hôm nay đã hoàn thành việc vệ sinh rồi nhé! Không cần ping thêm.' });
    }

    // Kiểm tra cooldown 3 phút để chống spam
    const db = require('../config/db');
    const lastPing = db.prepare(`
      SELECT sent_at FROM email_logs
      WHERE schedule_id = ? AND subject LIKE '%[Ẩn danh]%'
      ORDER BY id DESC LIMIT 1
    `).get(todaySchedule.id);

    if (lastPing && lastPing.sent_at) {
      const lastTime = new Date(lastPing.sent_at.replace(' ', 'T') + 'Z').getTime();
      const diffMinutes = (Date.now() - lastTime) / (60 * 1000);
      if (diffMinutes < 3) {
        const waitSeconds = Math.ceil((3 - diffMinutes) * 60);
        return res.status(429).json({
          success: false,
          cooldown: true,
          message: `Vừa có một bạn cùng phòng gửi lời nhắc ẩn danh rồi. Vui lòng chờ ${waitSeconds}s nữa nhé!`
        });
      }
    }

    // Gửi email ẩn danh
    const result = await EmailService.sendAnonymousPing(todaySchedule);

    const pingCount = db.prepare(`
      SELECT COUNT(*) as c FROM email_logs
      WHERE schedule_id = ? AND subject LIKE '%[Ẩn danh]%'
    `).get(todaySchedule.id).c;

    res.json({
      ...result,
      pingCount
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

