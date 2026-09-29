# 🧹 HỆ THỐNG QUẢN LÝ LỊCH VỆ SINH PHÒNG TRỌ (8 THÀNH VIÊN)

Dự án chuyên biệt dành cho phòng trọ 8 người, tự động sinh lịch vệ sinh **xoay vòng liên tục theo từng ngày** (không cố định theo tuần), tự động gửi email nhắc việc cho đúng người phụ trách vào đúng ngày được phân công, có dashboard theo dõi trạng thái công việc và nhật ký email.

---

## 🌟 TÍNH NĂNG NỔI BẬT

1. **Thuật toán xoay vòng liên tục theo từng ngày:**
   - 8 thành viên luân phiên: `A ➔ B ➔ C ➔ D ➔ E ➔ F ➔ G ➔ H ➔ A ➔ B...`
   - Công thức toán học: `index = (Số ngày kể từ ngày bắt đầu) % Số lượng thành viên hoạt động`.
   - Xử lý mượt mà qua các ranh giới ngày, tháng, năm nhuận.

2. **Gửi Email tự động thông minh:**
   - Đến đúng ngày và đúng giờ đã cấu hình (mặc định `07:00` sáng), hệ thống tự động quét và gửi email nhắc việc tới đúng email của người phụ trách ngày hôm đó.
   - Cơ chế bảo vệ: Tuyệt đối không gửi lặp email nhiều lần trong cùng một ngày.
   - Hỗ trợ cả 2 chế độ:
     * **Chế độ Giả lập (Test/Simulation):** Xem trước nội dung email HTML trực tiếp trên web ngay cả khi chưa có tài khoản SMTP.
     * **Chế độ SMTP Thực tế:** Kết nối trực tiếp vào Gmail (thông qua App Password) hoặc SMTP máy chủ riêng.
   - Có nút bấm **"Gửi thử nghiệm"** để kiểm tra email bất kỳ lúc nào mà không cần chờ đến ngày thực tế.

3. **Giao diện hiện đại & Mobile-first:**
   - **Dashboard:** Banner hiển thị người phụ trách hôm nay, nút đánh dấu `[Đã hoàn thành]`, nút `[Gửi email ngay]`, 4 thẻ thống kê và danh sách 7 ngày tới.
   - **Lịch vệ sinh:** Xem theo danh sách ngày, đổi trạng thái công việc nhanh, đổi người phụ trách cho một ngày cụ thể (email tự động chuyển sang người mới).
   - **Thành viên:** Quản lý 8 người (Họ tên, Email, STT xoay vòng, Trạng thái hoạt động).
   - **Nhật ký Email:** Xem lịch sử gửi thư và bấm xem trực tiếp giao diện email HTML.
   - **Cài đặt:** Thiết lập tên phòng, ngày bắt đầu/kết thúc, giờ gửi email và cấu hình SMTP.

---

## 🚀 CÁCH CHẠY ỨNG DỤNG

### Cách 1: Một cú nhấp chuột (Khuyến nghị trên Windows)
Nhấp đúp chuột vào file **`run.bat`** trong thư mục `Don_Phong`. Hệ thống sẽ tự động khởi động và mở trình duyệt web.

### Cách 2: Khởi động qua dòng lệnh (Terminal/PowerShell)
```bash
cd Don_Phong
npm install
node server.js
```

Sau khi chạy:
- 💻 Truy cập trên máy tính: `http://localhost:3000`
- 📱 Truy cập trên điện thoại (cùng mạng Wi-Fi): `http://[IP_LAN]:3000` (hiển thị rõ trên màn hình console).

---

## ⏰ CẤU HÌNH TÁC VỤ CRON / TASK SCHEDULER TRÊN MÔI TRƯỜNG THỰC TẾ

### 1. Trên Windows (Sử dụng Windows Task Scheduler):
1. Nhấn `Windows + R`, gõ `taskschd.msc` và nhấn Enter.
2. Chọn **Create Basic Task...** (Tạo tác vụ cơ bản).
3. Đặt tên: `Nhac_Lich_Ve_Sinh_Phong`.
4. Trigger: Chọn **Daily** (Hàng ngày) vào lúc `07:00:00 AM`.
5. Action: Chọn **Start a program**.
   - Program/script: `node`
   - Add arguments: `cron/send_daily_reminder.js`
   - Start in: Đường dẫn thư mục `Don_Phong` (VD: `C:\Users\Admin\Desktop\tạo bình chọn\Don_Phong`).
6. Nhấn **Finish**. Hệ thống sẽ tự động chạy script này mỗi sáng đúng 7h.

### 2. Trên Linux / VPS Hosting (Crontab):
Mở terminal và gõ `crontab -e`, thêm dòng sau để chạy lúc 7h sáng mỗi ngày:
```bash
0 7 * * * cd /duong-dan/Don_Phong && /usr/bin/node cron/send_daily_reminder.js >> /var/log/ve_sinh.log 2>&1
```

---

## 📁 CẤU TRÚC DỰ ÁN

```
Don_Phong/
├── config/
│   └── db.js                  # Kết nối SQLite (node:sqlite chuẩn)
├── database/
│   ├── schema.sql             # Cấu trúc bảng SQL
│   ├── seed.js                # Nạp 8 thành viên mẫu & cài đặt ban đầu
│   └── room_cleaning.db       # Database SQLite tự động tạo
├── models/
│   ├── Member.js              # Model Thành viên (CRUD, STT, Active)
│   ├── Schedule.js            # Model Lịch (Logic xoay vòng, trạng thái)
│   ├── EmailLog.js            # Model Nhật ký email
│   └── Setting.js             # Model Cài đặt hệ thống
├── services/
│   ├── emailService.js        # Gửi email HTML, SMTP & Test Mode
│   └── schedulerService.js    # Tiến trình tự động theo dõi giờ gửi hàng ngày
├── controllers/
│   ├── memberController.js    # API Thành viên
│   ├── scheduleController.js  # API Lịch vệ sinh
│   ├── emailController.js     # API Gửi email & xem log
│   └── settingController.js   # API Cài đặt
├── cron/
│   └── send_daily_reminder.js # Script độc lập cho Task Scheduler / Crontab
├── public/
│   ├── index.html             # Giao diện chính (SPA 5 màn hình)
│   ├── css/
│   │   └── style.css          # CSS responsive, modern
│   └── js/
│       └── app.js             # Xử lý logic tương tác người dùng
├── server.js                  # Entry point Express Server
├── run.bat                    # Script khởi chạy nhanh trên Windows
├── package.json               # Cấu hình dự án & thư viện
└── README.md                  # Hướng dẫn chi tiết
```
