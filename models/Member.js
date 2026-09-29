const db = require('../config/db');

class Member {
  static getAll() {
    return db.prepare('SELECT * FROM members ORDER BY sequence_order ASC, id ASC').all();
  }

  static getActive() {
    return db.prepare('SELECT * FROM members WHERE is_active = 1 ORDER BY sequence_order ASC, id ASC').all();
  }

  static getById(id) {
    return db.prepare('SELECT * FROM members WHERE id = ?').get(id);
  }

  static create({ name, email, sequence_order, is_active = 1 }) {
    // Nếu chưa có sequence_order, gán bằng max + 1
    if (!sequence_order) {
      const maxOrder = db.prepare('SELECT MAX(sequence_order) as maxOrder FROM members').get().maxOrder || 0;
      sequence_order = maxOrder + 1;
    }

    const stmt = db.prepare(`
      INSERT INTO members (name, email, sequence_order, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
    `);
    const result = stmt.run(name.trim(), email.trim(), sequence_order, is_active ? 1 : 0);
    return this.getById(result.lastInsertRowid);
  }

  static update(id, { name, email, sequence_order, is_active }) {
    const current = this.getById(id);
    if (!current) return null;

    const newName = name !== undefined ? name.trim() : current.name;
    const newEmail = email !== undefined ? email.trim() : current.email;
    const newOrder = sequence_order !== undefined ? Number(sequence_order) : current.sequence_order;
    const newActive = is_active !== undefined ? (is_active ? 1 : 0) : current.is_active;

    db.prepare(`
      UPDATE members
      SET name = ?, email = ?, sequence_order = ?, is_active = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newName, newEmail, newOrder, newActive, id);

    return this.getById(id);
  }

  static delete(id) {
    return db.prepare('DELETE FROM members WHERE id = ?').run(id);
  }

  static reorder(orderedIds) {
    const updateStmt = db.prepare('UPDATE members SET sequence_order = ?, updated_at = datetime(\'now\') WHERE id = ?');
    orderedIds.forEach((id, index) => {
      updateStmt.run(index + 1, id);
    });
    return this.getAll();
  }
}

module.exports = Member;
