# Sample Data

## Nên dùng như thế nào

Giải pháp đơn giản nhất là tạo **1 Google Spreadsheet** và trong đó có **2 tab**:

- `Admins`
- `Students`

Không nên tạo 2 file Google Sheets riêng nếu bạn đang dùng đúng kiến trúc của repo này.

## Cách import

1. Tạo 1 Google Spreadsheet mới
2. Đổi tab đầu tiên thành `Admins`
3. Import file [admins.csv](e:/Duy Data/thaylong-admin-dashboard.github.io/sample-data/admins.csv) vào tab đó
4. Tạo thêm tab mới tên `Students`
5. Import file [students.csv](e:/Duy Data/thaylong-admin-dashboard.github.io/sample-data/students.csv) vào tab đó

## Chia quyền đúng

Bạn **không cần share Google Sheet cho GitHub Pages**.

Luồng đúng là:

- GitHub Pages chỉ host frontend static
- Frontend gọi URL Web App của Google Apps Script
- Google Apps Script mới là thành phần đọc sheet và tạo token

Thiết lập đơn giản nhất:

1. Tạo spreadsheet bằng chính tài khoản Google mà bạn sẽ dùng để deploy Apps Script
2. Mở spreadsheet đó, vào `Extensions -> Apps Script`
3. Dán file [gas/Code.gs](e:/Duy Data/thaylong-admin-dashboard.github.io/gas/Code.gs)
4. Deploy thành `Web app`
5. Chọn:
   - `Execute as`: `Me`
   - `Who has access`: `Anyone`

Với cấu hình này:

- Apps Script chạy bằng quyền của chính bạn
- Apps Script đọc được spreadsheet vì script gắn trực tiếp vào spreadsheet
- Frontend trên GitHub Pages chỉ cần gọi URL Web App, không cần quyền đọc Google Drive

## Nếu bạn vẫn muốn tách sheet và script

Trường hợp này spreadsheet phải được share cho đúng tài khoản đang deploy Apps Script với quyền tối thiểu `Viewer`, nhưng repo hiện tại không cần cách đó.
