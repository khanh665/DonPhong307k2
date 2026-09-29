const db = require('../config/db');

class EmailLog {
  static create({ schedule_id, recipient, subject, status, error_message = null, preview_content = null }) {
    const stmt = db.prepare(`
      INSERT INTO email_logs (schedule_id, recipient, subject, status, sent_at, error_message, preview_content)
      VALUES (?, ?, ?, ?, datetime('now'), ?, ?)
    `);
    const res = stmt.run(schedule_id, recipient, subject, status, error_message, preview_content);
    return this.getById(res.lastInsertRowid);
  }

  static getById(id) {
    return db.prepare('SELECT * FROM email_logs WHERE id = ?').get(id);
  }

  static getRecent(limit = 50) {
    return db.prepare(`
      SELECT l.*, s.cleaning_date
      FROM email_logs l
      LEFT JOIN cleaning_schedules s ON l.schedule_id = s.id
      ORDER BY l.id DESC
      LIMIT ?
    `).all(limit);
  }
}

module.exports = EmailLog;
