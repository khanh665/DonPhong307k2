const { DatabaseSync } = require('node:sqlite');
const path = require('path');
const fs = require('fs');

const DB_DIR = path.join(__dirname, '..', 'database');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_PATH = path.join(DB_DIR, 'room_cleaning.db');
const db = new DatabaseSync(DB_PATH);

// Bật Foreign Keys
db.exec('PRAGMA foreign_keys = ON;');

// Khởi tạo bảng nếu chưa có
function initDatabase() {
  const schemaPath = path.join(__dirname, '..', 'database', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  db.exec(schemaSql);
}

initDatabase();

module.exports = db;
