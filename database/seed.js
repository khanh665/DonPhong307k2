const db = require('../config/db');

function seedData() {
  console.log('🌱 Đang kiểm tra và khởi tạo dữ liệu mẫu...');

  // 1. Khởi tạo cài đặt mặc định
  const defaultSettings = [
    { key: 'room_name', value: process.env.ROOM_NAME || 'Phòng 307K2 - KTX UTB', description: 'Tên phòng trọ' },
    { key: 'start_date', value: new Date().toISOString().split('T')[0], description: 'Ngày bắt đầu phân công' },
    { key: 'end_date', value: '2026-12-31', description: 'Ngày kết thúc phân công' },
    { key: 'reminder_time', value: '07:00', description: 'Thời gian gửi email nhắc nhở mỗi sáng' },
    { key: 'email_mode', value: process.env.EMAIL_MODE || 'smtp', description: 'Chế độ gửi: simulation (giả lập/test) hoặc smtp (thực tế)' },
    { key: 'smtp_host', value: process.env.SMTP_HOST || 'smtp.gmail.com', description: 'SMTP Host' },
    { key: 'smtp_port', value: process.env.SMTP_PORT || '587', description: 'SMTP Port' },
    { key: 'smtp_secure', value: '0', description: '1 cho 465 SSL, 0 cho 587 TLS' },
    { key: 'smtp_user', value: process.env.SMTP_USER || 'khanhva92@gmail.com', description: 'Tài khoản Gmail/SMTP' },
    { key: 'smtp_pass', value: process.env.SMTP_PASS || '', description: 'Mật khẩu ứng dụng Gmail (App Password)' },
    { key: 'smtp_from_name', value: 'Ban Quản Lý Phòng 307K2 - KTX UTB', description: 'Tên người gửi email' },
    { key: 'smtp_from_email', value: process.env.SMTP_USER || 'khanhva92@gmail.com', description: 'Email người gửi' },
    { key: 'brevo_api_key', value: process.env.BREVO_API_KEY || '', description: 'API Key Brevo (Gửi qua HTTPS port 443 trên Cloud)' }
  ];

  const checkSettingStmt = db.prepare('SELECT value FROM settings WHERE key = ?');
  const insertSettingStmt = db.prepare('INSERT INTO settings (key, value, description) VALUES (?, ?, ?)');

  for (const s of defaultSettings) {
    const existing = checkSettingStmt.get(s.key);
    if (!existing) {
      insertSettingStmt.run(s.key, s.value, s.description);
    }
  }

  // 2. Khởi tạo 8 thành viên mẫu (A đến H) nếu bảng còn trống
  const memberCount = db.prepare('SELECT COUNT(*) as count FROM members').get().count;
  if (memberCount === 0) {
    const demoMembers = [
      { name: 'Và Ngọc Khánh', email: 'vangockhanh@gmail.com', order: 1 },
      { name: 'Giàng A Tùng', email: 'khanhva92@gmail.com', order: 2 },
      { name: 'Vàng A Thanh', email: 'vangockhanh365@gmail.com', order: 3 },
      { name: 'Nguyễn Văn D', email: 'd@gmail.com', order: 4 },
      { name: 'Nguyễn Văn E', email: 'e@gmail.com', order: 5 },
      { name: 'Nguyễn Văn F', email: 'f@gmail.com', order: 6 },
      { name: 'Nguyễn Văn G', email: 'g@gmail.com', order: 7 },
      { name: 'Nguyễn Văn H', email: 'h@gmail.com', order: 8 }
    ];

    const insertMemberStmt = db.prepare(`
      INSERT INTO members (name, email, sequence_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, 1, datetime('now'), datetime('now'))
    `);

    for (const m of demoMembers) {
      insertMemberStmt.run(m.name, m.email, m.order);
    }
    console.log('✅ Đã nạp thành công 8 thành viên mẫu (Nguyễn Văn A ➔ Nguyễn Văn H).');
  }

  console.log('🎉 Khởi tạo dữ liệu cơ sở hoàn tất!');
}

if (require.main === module) {
  seedData();
}

module.exports = seedData;
