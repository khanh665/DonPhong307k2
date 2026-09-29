const Schedule = require('../models/Schedule');
const Setting = require('../models/Setting');

exports.getSchedules = (req, res) => {
  try {
    const { startDate, endDate, status, limit, offset } = req.query;

    if (startDate && endDate) {
      const list = Schedule.getRange(startDate, endDate);
      return res.json({ success: true, data: list });
    }

    const list = Schedule.getAll(Number(limit) || 120, Number(offset) || 0, status || '');
    res.json({ success: true, data: list });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.getToday = (req, res) => {
  try {
    const today = Schedule.getTodaySchedule();
    res.json({ success: true, data: today });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.generate = (req, res) => {
  try {
    let { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      const settings = Setting.getAll();
      startDate = startDate || settings.start_date || Schedule.getTodayDateStr();
      endDate = endDate || settings.end_date || '2026-12-31';
    }

    const result = Schedule.generateSchedule(startDate, endDate);

    // Cập nhật lại setting ngày bắt đầu và kết thúc
    Setting.set('start_date', startDate);
    Setting.set('end_date', endDate);

    res.json({
      success: true,
      message: `Đã tự động sinh lịch thành công cho ${result.totalDays} ngày (${result.membersCount} thành viên xoay vòng liên tục)!`,
      data: result
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateStatus = (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const updated = Schedule.updateStatus(id, status);
    res.json({ success: true, data: updated, message: 'Cập nhật trạng thái thành công' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.changeMember = (req, res) => {
  try {
    const { id } = req.params;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({ success: false, message: 'Vui lòng chọn thành viên mới' });
    }

    const updated = Schedule.updateMember(id, memberId);
    res.json({ success: true, data: updated, message: 'Đã thay đổi người phụ trách cho ngày này' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getStats = (req, res) => {
  try {
    const stats = Schedule.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
