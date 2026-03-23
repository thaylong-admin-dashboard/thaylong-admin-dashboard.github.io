# ThayLong Admin Dashboard

## 1. Kiến trúc tổng thể

Giải pháp duy nhất của repo này là:

- Frontend static chạy trên GitHub Pages bằng `HTML + CSS + JavaScript thuần`
- Google Sheets lưu `Admins` và `Students`
- Google Apps Script làm API trung gian cho `login`, `session`, `stats`, `students`, `report`
- Sau khi đăng nhập thành công, frontend lưu token vào `localStorage` và chuyển sang URL cố định `/dashboard/`
- Mọi trang trong `/dashboard/` đều gọi API `session` để kiểm tra token trước khi tải dữ liệu

Luồng chuẩn:

1. Người dùng mở `/`
2. Form login gửi tài khoản/mật khẩu tới Google Apps Script
3. Apps Script kiểm tra sheet `Admins`, tạo token phiên và trả về thông tin admin
4. Frontend lưu token, rồi chuyển sang `/dashboard/`
5. Dashboard gọi `session`, `stats`, `students`, `report` để hiển thị dữ liệu từ sheet `Students`

## 2. Cấu trúc Google Sheet cần tạo

Tạo 1 Google Spreadsheet và gắn Apps Script trực tiếp vào spreadsheet đó.

File mẫu để import nhanh:

- [sample-data/admins.csv](e:/Duy Data/thaylong-admin-dashboard.github.io/sample-data/admins.csv)
- [sample-data/students.csv](e:/Duy Data/thaylong-admin-dashboard.github.io/sample-data/students.csv)
- Hướng dẫn import và chia quyền: [sample-data/README.md](e:/Duy Data/thaylong-admin-dashboard.github.io/sample-data/README.md)

### Sheet `Admins`

Hàng tiêu đề phải đúng thứ tự này:

| admin_id | username | password | full_name | role | is_active |
| --- | --- | --- | --- | --- | --- |
| ADM-001 | admin1 | 123456 | Nguyễn Văn A | Quản trị viên | TRUE |
| ADM-002 | admin2 | 123456 | Trần Thị B | Vận hành | TRUE |

Ghi chú:

- `username`: dùng để đăng nhập
- `password`: bản demo lưu trực tiếp để triển khai nhanh
- `is_active`: dùng `TRUE` hoặc `FALSE`

### Sheet `Students`

Hàng tiêu đề phải đúng thứ tự này:

| student_id | full_name | course_name | license_class | learning_status | fee_status | register_date | phone | note |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HV-001 | Lê Minh Hùng | Bổ túc tay lái | B2 | Đang học | Đã đủ | 2026-03-04 | 0900000001 | |
| HV-002 | Phạm Thu Hà | Học lái cơ bản | C | Chờ thi | Nợ học phí | 2026-03-11 | 0900000002 | Thi thử tuần sau |

Quy ước dữ liệu:

- `learning_status`: dùng thống nhất các giá trị như `Đang học`, `Chờ thi`, `Tạm dừng`, `Hoàn thành`
- `fee_status`: dùng `Đã đủ`, `Nợ học phí`
- `register_date`: nên nhập theo dạng `YYYY-MM-DD`

## 3. Các API Google Apps Script cần có

File mẫu đã có sẵn ở [gas/Code.gs](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/gas/Code.gs).

### `POST ?action=login`

Input:

- `username`
- `password`

Output:

```json
{
  "success": true,
  "data": {
    "token": "generated-session-token",
    "expiresAt": "2026-03-20T10:00:00.000Z",
    "admin": {
      "username": "admin1",
      "fullName": "Nguyễn Văn A",
      "role": "Quản trị viên"
    }
  }
}
```

### `GET ?action=session&token=...`

Input:

- `token`

Output:

```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "expiresAt": "2026-03-20T10:00:00.000Z",
    "admin": {
      "username": "admin1",
      "fullName": "Nguyễn Văn A",
      "role": "Quản trị viên"
    }
  }
}
```

### `GET ?action=stats&token=...`

Output:

```json
{
  "success": true,
  "data": {
    "summary": {
      "activeLearning": 42,
      "waitingExam": 18,
      "feeDebt": 9,
      "newThisMonth": 12
    },
    "recentStudents": []
  }
}
```

### `GET ?action=students&token=...`

Output:

```json
{
  "success": true,
  "data": {
    "summary": {},
    "students": []
  }
}
```

### `GET ?action=report&token=...&year=2026`

Output:

```json
{
  "success": true,
  "data": {
    "summary": {},
    "selectedYear": 2026,
    "years": [2026, 2025, 2024],
    "monthlyRegistrations": [2, 5, 8, 7, 0, 0, 0, 0, 0, 0, 0, 0]
  }
}
```

## 4. Cấu trúc file frontend cho GitHub Pages

```text
/
|-- index.html
|-- dashboard/
|   |-- index.html
|   |-- students/index.html
|   |-- report/index.html
|-- assets/
|   |-- css/
|   |   |-- base.css
|   |   |-- auth.css
|   |   `-- dashboard.css
|   `-- js/
|       |-- app-config.js
|       |-- modules/
|       |   |-- api.js
|       |   |-- auth.js
|       |   |-- env.js
|       |   |-- format.js
|       |   |-- layout.js
|       |   `-- storage.js
|       `-- pages/
|           |-- login.js
|           |-- dashboard-home.js
|           |-- students.js
|           `-- report.js
`-- gas/
    |-- Code.gs
    `-- appsscript.json
```

## 5. Luồng đăng nhập, lưu token, kiểm tra token

1. Sửa `apiBaseUrl` trong [assets/js/app-config.js](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/assets/js/app-config.js)
2. Người dùng đăng nhập tại `/`
3. [assets/js/pages/login.js](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/assets/js/pages/login.js) gọi API `login`
4. Nếu thành công, token được lưu vào `localStorage` qua [assets/js/modules/storage.js](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/assets/js/modules/storage.js)
5. Frontend chuyển hướng sang `/dashboard/`
6. Mỗi trang trong dashboard gọi [assets/js/modules/auth.js](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/assets/js/modules/auth.js) để kiểm tra token bằng API `session`
7. Token sai hoặc hết hạn thì xóa session và quay về `/`

## 6. Thiết kế bố cục UI chi tiết

### Dashboard chính

- Sidebar cố định bên trái, nền navy đậm
- Topbar phía trên, nền sáng, có 2 nút `Xem danh sách học viên` và `Xem report`
- Main content gồm 4 thẻ KPI
- Bên dưới là khối tóm tắt vận hành và bảng học viên mới gần đây

### Trang danh sách học viên

- Giữ nguyên sidebar và topbar
- Phần đầu vẫn có 4 KPI để nhìn nhanh tình hình trung tâm
- Bảng học viên đặt trong card lớn, có ô tìm kiếm để lọc theo mã, tên, khóa học, hạng xe
- Cột hiển thị: mã học viên, họ tên, khóa học / hạng xe, trạng thái học, học phí, ngày đăng ký

### Trang report

- Giữ nguyên shell admin
- Vẫn hiển thị 4 KPI ở trên
- Card chính chứa ô chọn năm và biểu đồ cột số lượng học viên đăng ký mới theo từng tháng
- Khi đổi năm, trang gọi lại API `report` và cập nhật chart tương ứng

## 7. Style guide UI cụ thể

- Màu chính:
  - Navy sidebar: `#0f1d3d`
  - Xanh dương nhấn: `#1d4ed8`
  - Cyan hỗ trợ: `#06b6d4`
  - Nền trang: `#f4f7fb`
  - Card: `#ffffff`
  - Chữ chính: `#122033`
  - Chữ phụ: `#64748b`
- Spacing:
  - Layout chính: `24px`
  - Grid cards: `20px`
  - Padding card: `20px` đến `24px`
- Card style:
  - Bo góc `20px`
  - Border mảnh `1px`
  - Shadow nhẹ
- Sidebar:
  - Rộng `280px`
  - Logo ở trên
  - Menu item bo tròn, item active dùng nền xanh trong suốt
- Button:
  - Primary: nền xanh dương, chữ trắng
  - Secondary: nền trắng, viền mảnh
  - Ghost: nền trong suốt
- Bảng:
  - Header nền xanh rất nhạt
  - Dòng cao, dễ scan
  - Badge trạng thái theo màu xanh, vàng, đỏ
- Biểu đồ:
  - Cột xanh dương
  - Grid line rất nhạt
  - Không dùng hiệu ứng nặng

## 8. Mẫu code tối thiểu

- Google Apps Script: [gas/Code.gs](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/gas/Code.gs)
- HTML login: [index.html](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/index.html)
- HTML dashboard: [dashboard/index.html](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/dashboard/index.html)
- CSS auth: [assets/css/auth.css](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/assets/css/auth.css)
- CSS dashboard: [assets/css/dashboard.css](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/assets/css/dashboard.css)
- JavaScript API/auth: [assets/js/modules/api.js](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/assets/js/modules/api.js), [assets/js/modules/auth.js](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/assets/js/modules/auth.js)
- JavaScript pages: [assets/js/pages/dashboard-home.js](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/assets/js/pages/dashboard-home.js), [assets/js/pages/students.js](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/assets/js/pages/students.js), [assets/js/pages/report.js](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/assets/js/pages/report.js)

## 9. Cách deploy và test end-to-end

1. Tạo Google Spreadsheet với 2 sheet `Admins` và `Students` đúng header ở trên
2. Mở `Extensions -> Apps Script`
3. Dán nội dung từ [gas/Code.gs](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/gas/Code.gs)
4. Deploy Apps Script dưới dạng `Web app`
   - Execute as: `Me`
   - Who has access: `Anyone`
5. Copy URL web app và dán vào `apiBaseUrl` trong [assets/js/app-config.js](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/assets/js/app-config.js)
6. Push repo này lên GitHub Pages
7. Mở `/`, đăng nhập bằng tài khoản trong sheet `Admins`
8. Kiểm tra:
   - đăng nhập thành công sẽ vào `/dashboard/`
   - trang dashboard tải KPI và học viên mới
   - trang `Students` hiển thị đủ dữ liệu và lọc được
   - trang `Report` đổi năm và đổi chart tương ứng

## File quan trọng

- Frontend entry: [index.html](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/index.html)
- Dashboard shell: [assets/js/modules/layout.js](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/assets/js/modules/layout.js)
- Apps Script backend: [gas/Code.gs](/e:/Duy%20Data/thaylong-admin-dashboard.github.io/gas/Code.gs)
