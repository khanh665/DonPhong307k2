const Member = require('../models/Member');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.getMembers = (req, res) => {
  try {
    const members = Member.getAll();
    res.json({ success: true, data: members });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.createMember = (req, res) => {
  try {
    const { name, email, sequence_order, is_active } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Họ và tên không được để trống' });
    }

    if (!email || !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Địa chỉ email không đúng định dạng' });
    }

    const newMember = Member.create({
      name: name.trim(),
      email: email.trim(),
      sequence_order: sequence_order ? Number(sequence_order) : undefined,
      is_active: is_active !== undefined ? is_active : 1
    });

    res.status(201).json({ success: true, data: newMember, message: 'Thêm thành viên thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateMember = (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, sequence_order, is_active } = req.body;

    if (email && !EMAIL_REGEX.test(email.trim())) {
      return res.status(400).json({ success: false, message: 'Địa chỉ email không đúng định dạng' });
    }

    const updated = Member.update(id, { name, email, sequence_order, is_active });
    if (!updated) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy thành viên' });
    }

    res.json({ success: true, data: updated, message: 'Cập nhật thành viên thành công' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.deleteMember = (req, res) => {
  try {
    const { id } = req.params;
    Member.delete(id);
    res.json({ success: true, message: 'Đã xóa thành viên khỏi danh sách' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.reorderMembers = (req, res) => {
  try {
    const { orderedIds } = req.body;
    if (!Array.isArray(orderedIds)) {
      return res.status(400).json({ success: false, message: 'Danh sách ID không hợp lệ' });
    }
    const updatedList = Member.reorder(orderedIds);
    res.json({ success: true, data: updatedList, message: 'Đã cập nhật thứ tự xoay vòng' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
