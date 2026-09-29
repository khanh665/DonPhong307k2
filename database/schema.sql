-- Database Schema for Cleaning Schedule System (Hệ thống Quản lý Vệ sinh Phòng trọ)
-- Compatible with SQLite and MySQL

CREATE TABLE IF NOT EXISTS members (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  sequence_order INTEGER NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS cleaning_schedules (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  member_id INTEGER NOT NULL,
  cleaning_date TEXT NOT NULL UNIQUE, -- YYYY-MM-DD
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' (Chưa làm), 'completed' (Đã làm), 'skipped' (Bỏ qua)
  email_status TEXT NOT NULL DEFAULT 'waiting', -- 'waiting' (Chờ gửi), 'sent' (Đã gửi), 'failed' (Gửi lỗi)
  email_sent_at TEXT,
  completed_at TEXT,
  note TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (member_id) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS email_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  schedule_id INTEGER,
  recipient TEXT NOT NULL,
  subject TEXT NOT NULL,
  status TEXT NOT NULL, -- 'sent' or 'failed'
  sent_at TEXT NOT NULL,
  error_message TEXT,
  preview_content TEXT,
  FOREIGN KEY (schedule_id) REFERENCES cleaning_schedules(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT
);
