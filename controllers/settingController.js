const Setting = require('../models/Setting');

exports.getSettings = (req, res) => {
  try {
    const settings = Setting.getAll();
    // Ẩn mật khẩu khi trả về client để bảo mật
    const safeSettings = { ...settings };
    if (safeSettings.smtp_pass) {
      safeSettings.has_smtp_pass = true;
      safeSettings.smtp_pass = '********';
    } else {
      safeSettings.has_smtp_pass = false;
    }

    if (safeSettings.brevo_api_key) {
      safeSettings.has_brevo_api_key = true;
      safeSettings.brevo_api_key = '********';
    } else {
      safeSettings.has_brevo_api_key = false;
    }

    res.json({ success: true, data: safeSettings });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateSettings = (req, res) => {
  try {
    const updates = { ...req.body };

    // Nếu người dùng không nhập pass/key mới (để nguyên '********') thì không ghi đè
    if (updates.smtp_pass === '********') {
      delete updates.smtp_pass;
    }
    if (updates.brevo_api_key === '********') {
      delete updates.brevo_api_key;
    }

    const updated = Setting.setMultiple(updates);
    res.json({ success: true, data: updated, message: 'Đã lưu cấu hình hệ thống thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
