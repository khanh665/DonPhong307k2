const db = require('../config/db');

class Setting {
  static getAll() {
    const rows = db.prepare('SELECT key, value, description FROM settings').all();
    const map = {};
    rows.forEach(r => {
      map[r.key] = r.value;
    });
    return map;
  }

  static get(key, defaultValue = null) {
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
