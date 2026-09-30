const dns = require('dns');
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

const express = require('express');
const cors = require('cors');
const path = require('path');
const os = require('os');

// Khởi tạo Database & Seed mẫu
require('./config/db');
const seedData = require('./database/seed.js');
seedData();

// Tự động sinh lịch ban đầu nếu chưa có lịch nào
const Schedule = require('./models/Schedule');
const Setting = require('./models/Setting');
try {
  const currentStats = Schedule.getStats();
  if (currentStats.totalSchedules === 0) {
    const today = Schedule.getTodayDateStr();
    console.log(`📅 Đang tự động sinh lịch vệ sinh ban đầu từ ${today} đến 2026-12-31...`);
    Schedule.generateSchedule(today, '2026-12-31');
    console.log('✅ Đã sinh lịch thành công!');
  }
} catch (e) {
  console.log('Thông báo sinh lịch:', e.message);
}

// Controllers
const memberController = require('./controllers/memberController');
const scheduleController = require('./controllers/scheduleController');
const emailController = require('./controllers/emailController');
const settingController = require('./controllers/settingController');

// Khởi chạy tiến trình nhắc việc tự động
const SchedulerService = require('./services/schedulerService');
SchedulerService.start();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// === API ROUTES ===

// 1. Members
app.get('/api/members', memberController.getMembers);
app.post('/api/members', memberController.createMember);
app.put('/api/members/:id', memberController.updateMember);
app.delete('/api/members/:id', memberController.deleteMember);
app.post('/api/members/reorder', memberController.reorderMembers);

// 2. Schedules
app.get('/api/schedules', scheduleController.getSchedules);
app.get('/api/schedules/today', scheduleController.getToday);
app.get('/api/schedules/stats', scheduleController.getStats);
app.post('/api/schedules/generate', scheduleController.generate);
app.put('/api/schedules/:id/status', scheduleController.updateStatus);
app.put('/api/schedules/:id/member', scheduleController.changeMember);

// 3. Email & Logs
app.post('/api/email/send-today', emailController.sendTodayReminder);
app.post('/api/email/send/:scheduleId', emailController.sendScheduleReminder);
app.post('/api/email/test', emailController.sendTestEmail);
app.post('/api/email/anonymous-ping', emailController.sendAnonymousPing);
app.get('/api/email/logs', emailController.getLogs);

// 4. Settings
app.get('/api/settings', settingController.getSettings);
app.put('/api/settings', settingController.updateSettings);

// 5. External Cron Webhook (Dành riêng cho cron-job.org gọi kích hoạt lúc 07:00 sáng)
app.get('/api/cron/trigger', async (req, res) => {
  try {
    const result = await SchedulerService.checkAndSendToday(false);
    res.json({
      success: true,
      message: 'Tác vụ Cron đã kích hoạt thành công!',
      timestamp: new Date().toISOString(),
      result
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Fallback to Single Page App
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Lấy IP nội bộ
function getLocalIpAddress() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return 'localhost';
}

app.listen(PORT, '0.0.0.0', () => {
  const localIp = getLocalIpAddress();
  console.log('================================================================');
  console.log('🎉 HỆ THỐNG QUẢN LÝ VỆ SINH PHÒNG TRỌ ĐÃ KHỞI CHẠY THÀNH CÔNG!');
  console.log('----------------------------------------------------------------');
  console.log(`💻 Mở trên máy tính:    http://localhost:${PORT}`);
  console.log(`📱 Mở trên điện thoại:   http://${localIp}:${PORT}`);
  console.log('================================================================');
});
