const db = require('../config/db');

class Setting {
  static getAll() {
    const rows = db.prepare('SELECT key, value, description FROM settings').all();
    const map = {};
    rows.forEach(r => {
      map[r.key] = r.value;
    });

    // Ưu tiên đọc biến môi trường từ Render / Cloud nếu có:
    if (process.env.SMTP_USER) map.smtp_user = process.env.SMTP_USER;
    if (process.env.SMTP_PASS) map.smtp_pass = process.env.SMTP_PASS;
    if (process.env.SMTP_HOST) map.smtp_host = process.env.SMTP_HOST;
    if (process.env.SMTP_PORT) map.smtp_port = process.env.SMTP_PORT;
    if (process.env.ROOM_NAME) map.room_name = process.env.ROOM_NAME;
    if (process.env.BREVO_API_KEY) map.brevo_api_key = process.env.BREVO_API_KEY;

    // Nếu đã có SMTP_USER và SMTP_PASS hoặc BREVO_API_KEY thì kích hoạt gửi thật
    if ((map.smtp_user && map.smtp_pass) || map.brevo_api_key) {
      map.email_mode = 'smtp';
    } else if (process.env.EMAIL_MODE) {
      map.email_mode = process.env.EMAIL_MODE;
    }

    if (!map.smtp_from_email && map.smtp_user) {
      map.smtp_from_email = map.smtp_user;
    }

    return map;
  }

  static get(key, defaultValue = null) {
    if (key === 'brevo_api_key' && process.env.BREVO_API_KEY) return process.env.BREVO_API_KEY;
    if (key === 'smtp_user' && process.env.SMTP_USER) return process.env.SMTP_USER;
    if (key === 'smtp_pass' && process.env.SMTP_PASS) return process.env.SMTP_PASS;
    if (key === 'smtp_host' && process.env.SMTP_HOST) return process.env.SMTP_HOST;
    if (key === 'smtp_port' && process.env.SMTP_PORT) return process.env.SMTP_PORT;
    if (key === 'room_name' && process.env.ROOM_NAME) return process.env.ROOM_NAME;
    if (key === 'email_mode') {
      if ((process.env.SMTP_USER && process.env.SMTP_PASS) || process.env.BREVO_API_KEY) return 'smtp';
      if (process.env.EMAIL_MODE) return process.env.EMAIL_MODE;
    }

    const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
    return row ? row.value : defaultValue;
  }

  static set(key, value) {
    db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `).run(key, String(value));
  }

  static setMultiple(obj) {
    const stmt = db.prepare(`
      INSERT INTO settings (key, value)
      VALUES (?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value
    `);
    for (const [key, value] of Object.entries(obj)) {
      if (value !== undefined && value !== null) {
        stmt.run(key, String(value));
      }
    }
    return this.getAll();
  }
}

module.exports = Setting;
