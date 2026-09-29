const db = require('../config/db');
const Member = require('./Member');

class Schedule {
  /**
   * Sinh lịch vệ sinh xoay vòng liên tục theo từng ngày
   * Công thức: member_index = số_ngày_từ_ngày_bắt_đầu % số_thành_viên_hoạt_động
   */
  static generateSchedule(startDateStr, endDateStr) {
    const activeMembers = Member.getActive();
    if (!activeMembers || activeMembers.length === 0) {
      throw new Error('Chưa có thành viên nào đang hoạt động để sinh lịch!');
    }

    const [startYear, startMonth, startDay] = startDateStr.split('-').map(Number);
    const [endYear, endMonth, endDay] = endDateStr.split('-').map(Number);

    const startDate = new Date(Date.UTC(startYear, startMonth - 1, startDay));
    const endDate = new Date(Date.UTC(endYear, endMonth - 1, endDay));

    if (endDate < startDate) {
      throw new Error('Ngày kết thúc phải sau hoặc bằng ngày bắt đầu!');
    }

    const insertStmt = db.prepare(`
      INSERT INTO cleaning_schedules (member_id, cleaning_date, status, email_status, created_at, updated_at)
      VALUES (?, ?, 'pending', 'waiting', datetime('now'), datetime('now'))
      ON CONFLICT(cleaning_date) DO UPDATE SET
        member_id = excluded.member_id,
        updated_at = datetime('now')
      WHERE cleaning_schedules.status != 'completed'
    `);

    let generatedCount = 0;
    const oneDayMs = 24 * 60 * 60 * 1000;
    const totalDays = Math.round((endDate.getTime() - startDate.getTime()) / oneDayMs) + 1;

    for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
      const currentCal = new Date(startDate.getTime() + dayOffset * oneDayMs);
      const yyyy = currentCal.getUTCFullYear();
      const mm = String(currentCal.getUTCMonth() + 1).padStart(2, '0');
      const dd = String(currentCal.getUTCDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;

      // Logic xoay vòng chuẩn xác:
      const memberIndex = dayOffset % activeMembers.length;
      const assignedMember = activeMembers[memberIndex];

      insertStmt.run(assignedMember.id, dateStr);
      generatedCount++;
    }

    return { totalDays, generatedCount, membersCount: activeMembers.length };
  }

  static getTodayDateStr() {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }

  static getTodaySchedule() {
    const todayStr = this.getTodayDateStr();
    return db.prepare(`
      SELECT s.*, m.name as member_name, m.email as member_email, m.sequence_order
      FROM cleaning_schedules s
      JOIN members m ON s.member_id = m.id
      WHERE s.cleaning_date = ?
    `).get(todayStr);
  }

  static getByDate(dateStr) {
    return db.prepare(`
      SELECT s.*, m.name as member_name, m.email as member_email
      FROM cleaning_schedules s
      JOIN members m ON s.member_id = m.id
      WHERE s.cleaning_date = ?
    `).get(dateStr);
  }

  static getRange(startDate, endDate) {
    return db.prepare(`
      SELECT s.*, m.name as member_name, m.email as member_email, m.sequence_order
      FROM cleaning_schedules s
      JOIN members m ON s.member_id = m.id
      WHERE s.cleaning_date >= ? AND s.cleaning_date <= ?
      ORDER BY s.cleaning_date ASC
    `).all(startDate, endDate);
  }

  static getAll(limit = 100, offset = 0, statusFilter = '') {
    let query = `
      SELECT s.*, m.name as member_name, m.email as member_email, m.sequence_order
      FROM cleaning_schedules s
      JOIN members m ON s.member_id = m.id
    `;
    const params = [];

    if (statusFilter) {
      query += ` WHERE s.status = ? `;
      params.push(statusFilter);
    }

    query += ` ORDER BY s.cleaning_date ASC LIMIT ? OFFSET ? `;
    params.push(limit, offset);

    return db.prepare(query).all(...params);
  }

  static updateStatus(id, status) {
    const validStatuses = ['pending', 'completed', 'skipped'];
    if (!validStatuses.includes(status)) {
      throw new Error('Trạng thái công việc không hợp lệ');
    }

    const completedAt = (status === 'completed') ? new Date().toISOString() : null;

    db.prepare(`
      UPDATE cleaning_schedules
      SET status = ?, completed_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, completedAt, id);

    return this.getById(id);
  }

  static updateMember(scheduleId, newMemberId) {
    const member = Member.getById(newMemberId);
    if (!member) throw new Error('Thành viên không tồn tại!');

    db.prepare(`
      UPDATE cleaning_schedules
      SET member_id = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(newMemberId, scheduleId);

    return this.getById(scheduleId);
  }

  static updateEmailStatus(id, emailStatus, sentAt = null) {
    db.prepare(`
      UPDATE cleaning_schedules
      SET email_status = ?, email_sent_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(emailStatus, sentAt, id);
  }

  static getById(id) {
    return db.prepare(`
      SELECT s.*, m.name as member_name, m.email as member_email
      FROM cleaning_schedules s
      JOIN members m ON s.member_id = m.id
      WHERE s.id = ?
    `).get(id);
  }

  static getStats() {
    const totalMembers = db.prepare('SELECT COUNT(*) as c FROM members WHERE is_active = 1').get().c;
    const totalSchedules = db.prepare('SELECT COUNT(*) as c FROM cleaning_schedules').get().c;
    const completedCount = db.prepare("SELECT COUNT(*) as c FROM cleaning_schedules WHERE status = 'completed'").get().c;
    const pendingCount = db.prepare("SELECT COUNT(*) as c FROM cleaning_schedules WHERE status = 'pending'").get().c;
    const skippedCount = db.prepare("SELECT COUNT(*) as c FROM cleaning_schedules WHERE status = 'skipped'").get().c;
    const emailSentCount = db.prepare("SELECT COUNT(*) as c FROM cleaning_schedules WHERE email_status = 'sent'").get().c;
    const emailFailedCount = db.prepare("SELECT COUNT(*) as c FROM cleaning_schedules WHERE email_status = 'failed'").get().c;

    const todaySchedule = this.getTodaySchedule();

    return {
      totalMembers,
      totalSchedules,
      completedCount,
      pendingCount,
      skippedCount,
      emailSentCount,
      emailFailedCount,
      todaySchedule
    };
  }
}

module.exports = Schedule;
