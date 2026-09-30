// State ứng dụng
let currentMembers = [];
let currentSchedules = [];
let todaySchedule = null;

// Modal instances
let memberModal, changeMemberModal, generateModal, previewEmailModal;

document.addEventListener('DOMContentLoaded', () => {
  // Khởi tạo Bootstrap modals
  memberModal = new bootstrap.Modal(document.getElementById('memberModal'));
  changeMemberModal = new bootstrap.Modal(document.getElementById('changeMemberModal'));
  generateModal = new bootstrap.Modal(document.getElementById('generateModal'));
  previewEmailModal = new bootstrap.Modal(document.getElementById('previewEmailModal'));

  initClock();
  initNavigation();
  initEventHandlers();

  // Tải dữ liệu ban đầu
  loadDashboard();
  loadMembers();
  loadSettings();
});

// Đồng hồ thời gian thực
function initClock() {
  const clockEl = document.getElementById('currentClock');
  function update() {
    const now = new Date();
    clockEl.innerHTML = `<i class="far fa-clock me-1"></i>${now.toLocaleTimeString('vi-VN')}`;
  }
  update();
  setInterval(update, 1000);
}

// Chuyển đổi tab màn hình
function initNavigation() {
  document.querySelectorAll('.app-tabs-nav .nav-link').forEach(btn => {
    btn.addEventListener('click', () => {
      const viewId = btn.getAttribute('data-view');
      switchView(viewId);
    });
  });
}

function switchView(viewId) {
  document.querySelectorAll('.app-tabs-nav .nav-link').forEach(b => {
    b.classList.toggle('active', b.getAttribute('data-view') === viewId);
  });

  document.querySelectorAll('.app-view').forEach(v => {
    v.classList.toggle('active', v.id === `view-${viewId}`);
  });

  if (viewId === 'dashboard') loadDashboard();
  if (viewId === 'schedules') loadSchedules();
  if (viewId === 'members') loadMembers();
  if (viewId === 'logs') loadEmailLogs();
  if (viewId === 'settings') loadSettings();
}

function initEventHandlers() {
  // Nút hành động trên Dashboard
  document.getElementById('btnAnonymousPing').addEventListener('click', handleAnonymousPing);
  document.getElementById('btnMarkTodayDone').addEventListener('click', handleMarkTodayDone);
  document.getElementById('btnSendTodayEmail').addEventListener('click', handleSendTodayEmail);

  // Lọc lịch
  document.getElementById('filterStatus').addEventListener('change', loadSchedules);
  document.getElementById('btnRefreshSchedules').addEventListener('click', loadSchedules);
  document.getElementById('btnOpenGenerateModal').addEventListener('click', openGenerateModal);

  // Sinh lịch
  document.getElementById('generateScheduleForm').addEventListener('submit', handleGenerateSchedule);

  // Thành viên
  document.getElementById('btnOpenAddMemberModal').addEventListener('click', () => openMemberModal());
  document.getElementById('memberForm').addEventListener('submit', handleSaveMember);

  // Đổi người trực
  document.getElementById('btnConfirmChangeMember').addEventListener('click', handleConfirmChangeMember);

  // Logs
  document.getElementById('btnRefreshLogs').addEventListener('click', loadEmailLogs);

  // Cài đặt
  document.getElementById('generalSettingsForm').addEventListener('submit', handleSaveGeneralSettings);
  document.getElementById('smtpSettingsForm').addEventListener('submit', handleSaveSmtpSettings);
  document.getElementById('btnTestEmailModal').addEventListener('click', promptTestEmail);
}

// === VIEW 1: DASHBOARD ===
async function loadDashboard() {
  try {
    const [statsRes, todayRes, next7Res] = await Promise.all([
      fetch('/api/schedules/stats').then(r => r.json()),
      fetch('/api/schedules/today').then(r => r.json()),
      fetch('/api/schedules?limit=7').then(r => r.json())
    ]);

    if (statsRes.success) {
      const s = statsRes.data;
      document.getElementById('statMembers').textContent = s.totalMembers || 8;
      document.getElementById('statCompleted').textContent = s.completedCount || 0;
      document.getElementById('statPending').textContent = s.pendingCount || 0;
      document.getElementById('statEmailSent').textContent = s.emailSentCount || 0;
    }

    if (todayRes.success && todayRes.data) {
      todaySchedule = todayRes.data;
      renderTodayBanner(todaySchedule);
      // Kiểm tra và hiển thị số lượt ping hôm nay nếu có
      fetch('/api/email/logs?limit=50').then(r => r.json()).then(lRes => {
        if (lRes.success && lRes.data) {
          const pings = lRes.data.filter(l => l.schedule_id === todaySchedule.id && l.subject.includes('[Ẩn danh]'));
          updatePingNotice(pings.length);
        }
      }).catch(() => {});
    } else {
      todaySchedule = null;
      document.getElementById('todayName').textContent = 'Chưa có lịch cho hôm nay';
      document.getElementById('todayDate').textContent = formatVietnameseDate(getTodayStr());
      document.getElementById('todayEmail').textContent = 'Hãy sinh lịch tự động trong phần Cài đặt';
      document.getElementById('btnMarkTodayDone').disabled = true;
      document.getElementById('btnSendTodayEmail').disabled = true;
    }

    if (next7Res.success) {
      renderUpcomingSchedules(next7Res.data);
    }
  } catch (err) {
    showToast('Lỗi tải dữ liệu Dashboard: ' + err.message, 'danger');
  }
}

function renderTodayBanner(schedule) {
  const [y, m, d] = schedule.cleaning_date.split('-');
  const dateFormatted = `${d}/${m}/${y}`;
  const dayName = getDayOfWeekName(schedule.cleaning_date);

  document.getElementById('todayName').textContent = schedule.member_name;
  document.getElementById('todayDate').textContent = `${dayName}, ${dateFormatted}`;
  document.getElementById('todayEmail').textContent = schedule.member_email;

  const btnDone = document.getElementById('btnMarkTodayDone');
  const btnEmail = document.getElementById('btnSendTodayEmail');
  btnDone.disabled = false;
  btnEmail.disabled = false;

  if (schedule.status === 'completed') {
    btnDone.className = 'btn btn-success fw-bold';
    btnDone.innerHTML = '<i class="fas fa-check-double me-1"></i>Đã xong việc';
  } else {
    btnDone.className = 'btn btn-light fw-bold text-primary shadow-sm';
    btnDone.innerHTML = '<i class="fas fa-check-circle text-success me-1"></i>Đánh dấu Đã hoàn thành';
  }

  if (schedule.email_status === 'sent') {
    btnEmail.innerHTML = '<i class="fas fa-check me-1"></i>Đã gửi email (Gửi lại)';
  } else {
    btnEmail.innerHTML = '<i class="fas fa-paper-plane me-1"></i>Gửi email ngay';
  }
}

function renderUpcomingSchedules(schedules) {
  const container = document.getElementById('upcomingSchedulesList');
  container.innerHTML = '';

  if (!schedules || schedules.length === 0) {
    container.innerHTML = `<div class="p-3 text-center text-muted">Chưa có lịch phân công. Vui lòng bấm 'Sinh lại lịch tự động'.</div>`;
    return;
  }

  const todayStr = getTodayStr();

  schedules.forEach(s => {
    const isToday = s.cleaning_date === todayStr;
    const dayName = getDayOfWeekName(s.cleaning_date);
    const [y, m, d] = s.cleaning_date.split('-');

    let statusBadge = '';
    if (s.status === 'completed') {
      statusBadge = '<span class="status-badge-custom badge-work-completed"><i class="fas fa-check"></i> Đã làm</span>';
    } else if (s.status === 'skipped') {
      statusBadge = '<span class="status-badge-custom badge-work-skipped">Bỏ qua</span>';
    } else {
      statusBadge = '<span class="status-badge-custom badge-work-pending">Chưa làm</span>';
    }

    const item = document.createElement('div');
    item.className = `list-group-item d-flex justify-content-between align-items-center py-2 ${isToday ? 'row-is-today' : ''}`;
    item.innerHTML = `
      <div class="d-flex align-items-center gap-3">
        <div style="min-width: 90px;">
          <strong class="d-block text-dark">${d}/${m}</strong>
          <small class="text-muted">${dayName}</small>
        </div>
        <div>
          <span class="fw-bold text-primary">${s.member_name} ${isToday ? '<span class="badge bg-primary ms-1">Hôm nay</span>' : ''}</span>
          <small class="d-block text-muted" style="font-size: 11px;">${s.member_email}</small>
        </div>
      </div>
      <div>
        ${statusBadge}
      </div>
    `;
    container.appendChild(item);
  });
}

// Đánh dấu hoàn thành hôm nay
async function handleMarkTodayDone() {
  if (!todaySchedule) return;
  const newStatus = todaySchedule.status === 'completed' ? 'pending' : 'completed';

  try {
    const res = await fetch(`/api/schedules/${todaySchedule.id}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    }).then(r => r.json());

    if (res.success) {
      showToast(newStatus === 'completed' ? '🎉 Đã đánh dấu hoàn thành vệ sinh hôm nay!' : 'Đã đổi trạng thái thành Chưa hoàn thành', 'success');
      loadDashboard();
    }
  } catch (err) {
    showToast('Lỗi cập nhật: ' + err.message, 'danger');
  }
}

// Gửi email hôm nay ngay lập tức
async function handleSendTodayEmail() {
  if (!todaySchedule) return;

  const btn = document.getElementById('btnSendTodayEmail');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang gửi...';

  try {
    const res = await fetch('/api/email/send-today', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ force: true })
    }).then(r => r.json());

    if (res.success) {
      if (res.mode === 'simulation') {
        showToast(`✉️ [Giả lập] Đã gửi thông báo tới ${todaySchedule.member_name} (${todaySchedule.member_email})!`, 'info');
      } else {
        showToast(`✉️ Đã gửi email thật tới ${todaySchedule.member_name} (${todaySchedule.member_email})!`, 'success');
      }
      loadDashboard();
    } else {
      showToast(`❌ Gửi thất bại: ${res.error || res.message}`, 'danger');
    }
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'danger');
  } finally {
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

// Gửi lời nhắc ẩn danh (Anonymous Ping)
async function handleAnonymousPing() {
  if (!todaySchedule) return;

  if (todaySchedule.status === 'completed') {
    showToast('✨ Hôm nay bạn trực nhật đã hoàn thành xong rồi, không cần ping nhắc nhở nữa nhé!', 'info');
    return;
  }

  const confirmPing = confirm(
    `⚡ GỬI LỜI NHẮC ẨN DANH?\n\nBạn có muốn gửi một email nhắc nhở dọn phòng đến ${todaySchedule.member_name}?\n\n🔒 Danh tính của bạn được giữ bí mật 100%, email sẽ chỉ ghi: "Một thành viên ẩn danh trong phòng 307K2 gửi lời nhắc".`
  );
  if (!confirmPing) return;

  const btn = document.getElementById('btnAnonymousPing');
  const originalHtml = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>Đang ping...';

  try {
    const res = await fetch('/api/email/anonymous-ping', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    }).then(r => r.json());

    if (res.success) {
      if (res.mode === 'simulation') {
        showToast(`⚡ [Giả lập] Đã gửi ping tới ${todaySchedule.member_name} (${todaySchedule.member_email})!`, 'info');
      } else {
        showToast(`⚡ Đã gửi email thật tới ${todaySchedule.member_name} (${todaySchedule.member_email})!`, 'success');
      }
      if (res.pingCount !== undefined) {
        updatePingNotice(res.pingCount);
      }
      // Bật đếm ngược cooldown 3 phút chống spam
      startPingCooldown(180);
    } else {
      showToast(`⚠️ ${res.message || res.error}`, res.cooldown ? 'warning' : 'danger');
      if (res.need_config) {
        setTimeout(() => {
          if (confirm(res.message + '\n\nBạn có muốn mở trang Cài Đặt ngay để điền thông tin gửi thư không?')) {
            switchView('settings');
          }
        }, 300);
      }
      btn.disabled = false;
      btn.innerHTML = originalHtml;
    }
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'danger');
    btn.disabled = false;
    btn.innerHTML = originalHtml;
  }
}

function updatePingNotice(count) {
  const noticeEl = document.getElementById('todayPingNotice');
  const valEl = document.getElementById('pingCountVal');
  if (count > 0) {
    valEl.textContent = count;
    noticeEl.classList.remove('d-none');
  } else {
    noticeEl.classList.add('d-none');
  }
}

function startPingCooldown(seconds) {
  const btn = document.getElementById('btnAnonymousPing');
  btn.disabled = true;
  let remaining = seconds;
  const interval = setInterval(() => {
    remaining--;
    if (remaining <= 0) {
      clearInterval(interval);
      btn.disabled = false;
      btn.innerHTML = '<i class="fas fa-bolt text-danger me-1"></i>Ping nhắc việc (Ẩn danh)';
    } else {
      btn.innerHTML = `<i class="fas fa-hourglass-half me-1"></i>Chờ ${remaining}s...`;
    }
  }, 1000);
}


// === VIEW 2: LỊCH VỆ SINH ===
async function loadSchedules() {
  const statusFilter = document.getElementById('filterStatus').value;
  try {
    const url = `/api/schedules?limit=120&status=${statusFilter}`;
    const res = await fetch(url).then(r => r.json());
    if (res.success) {
      currentSchedules = res.data;
      renderSchedulesTable(currentSchedules);
    }
  } catch (err) {
    showToast('Lỗi tải lịch: ' + err.message, 'danger');
  }
}

function renderSchedulesTable(schedules) {
  const tbody = document.getElementById('schedulesTableBody');
  tbody.innerHTML = '';

  if (!schedules || schedules.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center py-4 text-muted">Không tìm thấy lịch nào phù hợp.</td></tr>`;
    return;
  }

  const todayStr = getTodayStr();

  schedules.forEach(s => {
    const isToday = s.cleaning_date === todayStr;
    const [y, m, d] = s.cleaning_date.split('-');
    const dayName = getDayOfWeekName(s.cleaning_date);

    // Trạng thái công việc
    let workBadge = '';
    if (s.status === 'completed') {
      workBadge = `<span class="status-badge-custom badge-work-completed" onclick="cycleStatus(${s.id}, '${s.status}')" title="Bấm để đổi trạng thái"><i class="fas fa-check"></i> Đã làm</span>`;
    } else if (s.status === 'skipped') {
      workBadge = `<span class="status-badge-custom badge-work-skipped" onclick="cycleStatus(${s.id}, '${s.status}')" title="Bấm để đổi trạng thái"><i class="fas fa-times"></i> Bỏ qua</span>`;
    } else {
      workBadge = `<span class="status-badge-custom badge-work-pending" onclick="cycleStatus(${s.id}, '${s.status}')" title="Bấm để đổi trạng thái"><i class="fas fa-clock"></i> Chưa làm</span>`;
    }

    // Trạng thái email
    let mailBadge = '';
    if (s.email_status === 'sent') {
      mailBadge = `<span class="status-badge-custom badge-mail-sent"><i class="fas fa-check"></i> Đã gửi</span>`;
    } else if (s.email_status === 'failed') {
      mailBadge = `<span class="status-badge-custom badge-mail-failed"><i class="fas fa-exclamation-triangle"></i> Gửi lỗi</span>`;
    } else {
      mailBadge = `<span class="status-badge-custom badge-mail-waiting"><i class="far fa-clock"></i> Chờ gửi</span>`;
    }

    const tr = document.createElement('tr');
    if (isToday) tr.className = 'row-is-today';

    tr.innerHTML = `
      <td>
        <strong>${d}/${m}/${y}</strong>
        <small class="d-block text-muted">${dayName} ${isToday ? '<span class="badge bg-primary">Hôm nay</span>' : ''}</small>
      </td>
      <td>
        <span class="fw-bold">${s.member_name}</span>
      </td>
      <td>
        <small class="text-muted">${s.member_email}</small>
      </td>
      <td>${workBadge}</td>
      <td>${mailBadge}</td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-secondary btn-action-icon me-1" onclick="openChangeMemberModal(${s.id}, '${s.cleaning_date}', ${s.member_id})" title="Đổi người trực ngày này">
          <i class="fas fa-exchange-alt"></i>
        </button>
        <button class="btn btn-sm btn-outline-primary btn-action-icon" onclick="sendScheduleEmail(${s.id})" title="Gửi email cho ngày này ngay">
          <i class="fas fa-paper-plane"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Bấm trực tiếp vào badge để đổi vòng tròn: pending -> completed -> skipped -> pending
async function cycleStatus(scheduleId, currentStatus) {
  let next = 'completed';
  if (currentStatus === 'completed') next = 'skipped';
  else if (currentStatus === 'skipped') next = 'pending';

  try {
    const res = await fetch(`/api/schedules/${scheduleId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: next })
    }).then(r => r.json());

    if (res.success) {
      showToast('Đã cập nhật trạng thái', 'success');
      loadSchedules();
      if (todaySchedule && todaySchedule.id === scheduleId) loadDashboard();
    }
  } catch (e) {
    showToast('Lỗi cập nhật: ' + e.message, 'danger');
  }
}

// Đổi người trực
function openChangeMemberModal(scheduleId, dateStr, currentMemberId) {
  document.getElementById('changeScheduleId').value = scheduleId;
  const [y, m, d] = dateStr.split('-');
  document.getElementById('changeScheduleDate').textContent = `${d}/${m}/${y} (${getDayOfWeekName(dateStr)})`;

  const select = document.getElementById('newMemberSelect');
  select.innerHTML = '';
  currentMembers.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.id;
    opt.textContent = `${m.name} (${m.email})`;
    if (m.id === currentMemberId) opt.selected = true;
    select.appendChild(opt);
  });

  changeMemberModal.show();
}

async function handleConfirmChangeMember() {
  const scheduleId = document.getElementById('changeScheduleId').value;
  const newMemberId = document.getElementById('newMemberSelect').value;

  try {
    const res = await fetch(`/api/schedules/${scheduleId}/member`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ memberId: newMemberId })
    }).then(r => r.json());

    if (res.success) {
      changeMemberModal.hide();
      showToast('Đã đổi người phụ trách thành công!', 'success');
      loadSchedules();
      loadDashboard();
    }
  } catch (err) {
    showToast('Lỗi đổi người: ' + err.message, 'danger');
  }
}

// Gửi email cho 1 lịch bất kỳ
async function sendScheduleEmail(scheduleId) {
  if (!confirm('Gửi email nhắc việc cho người phụ trách ngày này ngay bây giờ?')) return;

  try {
    const res = await fetch(`/api/email/send/${scheduleId}`, { method: 'POST' }).then(r => r.json());
    if (res.success) {
      showToast(`✉️ Đã gửi email thành công tới ${res.recipient}!`, 'success');
      loadSchedules();
    } else {
      showToast(`❌ Gửi thất bại: ${res.error || res.message}`, 'danger');
    }
  } catch (e) {
    showToast('Lỗi: ' + e.message, 'danger');
  }
}

// Mở modal sinh lịch
function openGenerateModal() {
  const today = getTodayStr();
  document.getElementById('genStartDate').value = today;
  document.getElementById('genEndDate').value = '2026-12-31';
  generateModal.show();
}

async function handleGenerateSchedule(e) {
  e.preventDefault();
  const startDate = document.getElementById('genStartDate').value;
  const endDate = document.getElementById('genEndDate').value;

  try {
    const res = await fetch('/api/schedules/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ startDate, endDate })
    }).then(r => r.json());

    if (res.success) {
      generateModal.hide();
      showToast(res.message, 'success');
      loadSchedules();
      loadDashboard();
    } else {
      showToast('❌ ' + res.message, 'danger');
    }
  } catch (err) {
    showToast('Lỗi sinh lịch: ' + err.message, 'danger');
  }
}

// === VIEW 3: THÀNH VIÊN ===
async function loadMembers() {
  try {
    const res = await fetch('/api/members').then(r => r.json());
    if (res.success) {
      currentMembers = res.data;
      renderMembersTable(currentMembers);
    }
  } catch (e) {
    showToast('Lỗi tải thành viên: ' + e.message, 'danger');
  }
}

function renderMembersTable(members) {
  const tbody = document.getElementById('membersTableBody');
  tbody.innerHTML = '';

  members.forEach((m) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><span class="badge bg-secondary">${m.sequence_order}</span></td>
      <td><strong>${m.name}</strong></td>
      <td><code>${m.email}</code></td>
      <td>
        <span class="badge ${m.is_active ? 'bg-success' : 'bg-danger'}">
          ${m.is_active ? 'Hoạt động' : 'Tạm ngưng'}
        </span>
      </td>
      <td class="text-end">
        <button class="btn btn-sm btn-outline-primary btn-action-icon me-1" onclick="openMemberModal(${m.id})">
          <i class="fas fa-edit"></i>
        </button>
        <button class="btn btn-sm btn-outline-danger btn-action-icon" onclick="deleteMember(${m.id}, '${m.name}')">
          <i class="fas fa-trash"></i>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openMemberModal(memberId = null) {
  const form = document.getElementById('memberForm');
  form.reset();

  if (memberId) {
    const m = currentMembers.find(item => item.id === memberId);
    if (m) {
      document.getElementById('memberModalTitle').textContent = 'Sửa thông tin thành viên';
      document.getElementById('memberId').value = m.id;
      document.getElementById('memberNameInput').value = m.name;
      document.getElementById('memberEmailInput').value = m.email;
      document.getElementById('memberOrderInput').value = m.sequence_order;
      document.getElementById('memberActiveInput').value = m.is_active ? '1' : '0';
    }
  } else {
    document.getElementById('memberModalTitle').textContent = 'Thêm thành viên mới';
    document.getElementById('memberId').value = '';
    document.getElementById('memberOrderInput').value = currentMembers.length + 1;
    document.getElementById('memberActiveInput').value = '1';
  }

  memberModal.show();
}

async function handleSaveMember(e) {
  e.preventDefault();
  const id = document.getElementById('memberId').value;
  const name = document.getElementById('memberNameInput').value.trim();
  const email = document.getElementById('memberEmailInput').value.trim();
  const sequence_order = Number(document.getElementById('memberOrderInput').value);
  const is_active = Number(document.getElementById('memberActiveInput').value);

  const payload = { name, email, sequence_order, is_active };

  try {
    const url = id ? `/api/members/${id}` : '/api/members';
    const method = id ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(r => r.json());

    if (res.success) {
      memberModal.hide();
      showToast(res.message, 'success');
      loadMembers();
      loadDashboard();
    } else {
      showToast('❌ ' + res.message, 'danger');
    }
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'danger');
  }
}

async function deleteMember(id, name) {
  if (!confirm(`Bạn có chắc muốn xóa thành viên "${name}" khỏi phòng?`)) return;

  try {
    const res = await fetch(`/api/members/${id}`, { method: 'DELETE' }).then(r => r.json());
    if (res.success) {
      showToast('Đã xóa thành viên', 'success');
      loadMembers();
      loadDashboard();
    }
  } catch (e) {
    showToast('Lỗi xóa: ' + e.message, 'danger');
  }
}

// === VIEW 4: NHẬT KÝ EMAIL ===
async function loadEmailLogs() {
  try {
    const res = await fetch('/api/email/logs').then(r => r.json());
    if (res.success) {
      renderEmailLogsTable(res.data);
    }
  } catch (e) {
    showToast('Lỗi tải logs: ' + e.message, 'danger');
  }
}

function renderEmailLogsTable(logs) {
  const tbody = document.getElementById('emailLogsTableBody');
  tbody.innerHTML = '';

  if (!logs || logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-4 text-muted">Chưa có nhật ký gửi email nào.</td></tr>`;
    return;
  }

  logs.forEach(log => {
    const isSuccess = log.status === 'sent';
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><small>${log.sent_at}</small></td>
      <td><strong>${log.recipient}</strong></td>
      <td>${log.subject}</td>
      <td>
        <span class="badge ${isSuccess ? 'bg-success' : 'bg-danger'}">
          ${isSuccess ? 'Thành công' : 'Thất bại'}
        </span>
        ${log.error_message ? `<small class="d-block text-danger">${log.error_message}</small>` : ''}
      </td>
      <td class="text-end">
        ${log.preview_content ? `<button class="btn btn-sm btn-outline-info btn-action-icon" onclick="previewEmailHtml(${log.id})" title="Xem nội dung thư"><i class="fas fa-eye"></i></button>` : ''}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

async function previewEmailHtml(logId) {
  try {
    const res = await fetch('/api/email/logs').then(r => r.json());
    const log = res.data.find(l => l.id === logId);
    if (log && log.preview_content) {
      const iframe = document.getElementById('emailPreviewFrame');
      iframe.srcdoc = log.preview_content;
      previewEmailModal.show();
    }
  } catch (e) {
    showToast('Không thể xem email', 'danger');
  }
}

// === VIEW 5: CÀI ĐẶT ===
async function loadSettings() {
  try {
    const res = await fetch('/api/settings').then(r => r.json());
    if (res.success) {
      const s = res.data;
      document.getElementById('navRoomName').textContent = s.room_name || 'Phòng trọ';
      document.getElementById('setRoomName').value = s.room_name || '';
      document.getElementById('setStartDate').value = s.start_date || getTodayStr();
      document.getElementById('setEndDate').value = s.end_date || '2026-12-31';
      document.getElementById('setReminderTime').value = s.reminder_time || '07:00';

      document.getElementById('setEmailMode').value = s.email_mode || 'simulation';
      document.getElementById('setSmtpHost').value = s.smtp_host || 'smtp.gmail.com';
      document.getElementById('setSmtpPort').value = s.smtp_port || '587';
      document.getElementById('setSmtpUser').value = s.smtp_user || '';
      document.getElementById('setSmtpPass').value = s.smtp_pass || '';
      document.getElementById('setBrevoApiKey').value = s.brevo_api_key || '';
    }
  } catch (e) {
    showToast('Lỗi tải cài đặt: ' + e.message, 'danger');
  }
}

async function handleSaveGeneralSettings(e) {
  e.preventDefault();
  const room_name = document.getElementById('setRoomName').value.trim();
  const start_date = document.getElementById('setStartDate').value;
  const end_date = document.getElementById('setEndDate').value;
  const reminder_time = document.getElementById('setReminderTime').value;

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ room_name, start_date, end_date, reminder_time })
    }).then(r => r.json());

    if (res.success) {
      showToast('Đã lưu cài đặt chung!', 'success');
      loadSettings();
      loadDashboard();
    }
  } catch (err) {
    showToast('Lỗi lưu cài đặt: ' + err.message, 'danger');
  }
}

async function handleSaveSmtpSettings(e) {
  e.preventDefault();
  const email_mode = document.getElementById('setEmailMode').value;
  const smtp_host = document.getElementById('setSmtpHost').value.trim();
  const smtp_port = document.getElementById('setSmtpPort').value.trim();
  const smtp_user = document.getElementById('setSmtpUser').value.trim();
  const smtp_pass = document.getElementById('setSmtpPass').value;
  const brevo_api_key = document.getElementById('setBrevoApiKey').value;

  try {
    const res = await fetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email_mode, smtp_host, smtp_port, smtp_user, smtp_pass, brevo_api_key })
    }).then(r => r.json());

    if (res.success) {
      showToast('Đã lưu cấu hình Email thành công!', 'success');
      loadSettings();
    }
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'danger');
  }
}

async function promptTestEmail() {
  const email = prompt('Nhập địa chỉ email của bạn để nhận thử email kiểm tra:', 'test@gmail.com');
  if (!email || !email.trim()) return;

  showToast('Đang gửi email thử nghiệm...', 'info');

  try {
    const res = await fetch('/api/email/test', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.trim() })
    }).then(r => r.json());

    if (res.success) {
      showToast(`🎉 ${res.message}`, 'success');
      loadEmailLogs();
    } else {
      showToast(`❌ Thất bại: ${res.message || res.error}`, 'danger');
    }
  } catch (err) {
    showToast('Lỗi: ' + err.message, 'danger');
  }
}

// Helpers
function getTodayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getDayOfWeekName(dateStr) {
  const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  const [y, m, d] = dateStr.split('-').map(Number);
  const dateObj = new Date(y, m - 1, d);
  return days[dateObj.getDay()];
}

function formatVietnameseDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return `${d}/${m}/${y}`;
}

function showToast(message, type = 'info') {
  const toastEl = document.getElementById('appToast');
  const msgEl = document.getElementById('toastMessage');
  msgEl.textContent = message;

  toastEl.className = `toast align-items-center text-white border-0 shadow bg-${type === 'danger' ? 'danger' : type === 'success' ? 'success' : 'primary'}`;
  const toast = new bootstrap.Toast(toastEl, { delay: 3500 });
  toast.show();
}
