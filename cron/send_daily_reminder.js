/**
 * Tác vụ Cron độc lập: send_daily_reminder.js
 * Có thể chạy qua Windows Task Scheduler hoặc Linux Crontab:
 *   node cron/send_daily_reminder.js
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const SchedulerService = require('../services/schedulerService');

async function run() {
  console.log('====================================================');
  console.log(`[CRON TASK] Chạy tác vụ kiểm tra lịch vệ sinh: ${new Date().toLocaleString('vi-VN')}`);
  console.log('====================================================');

  try {
    const result = await SchedulerService.checkAndSendToday(false);
    console.log('[CRON TASK KẾT QUẢ]:', JSON.stringify(result, null, 2));
    process.exit(0);
  } catch (err) {
    console.error('[CRON TASK LỖI]:', err.message);
    process.exit(1);
  }
}

run();
