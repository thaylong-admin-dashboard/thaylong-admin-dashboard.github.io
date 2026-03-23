# Yêu cầu xây dựng dashboard admin cho trung tâm dạy lái

## Vai trò
Hãy đóng vai một **senior full-stack engineer** kiêm **UI-focused dashboard designer**.

## Mục tiêu
Hướng dẫn tôi xây dựng một giải pháp **miễn phí, tối giản, dễ triển khai** cho một **dashboard admin chạy trên GitHub Pages**.

## Lưu ý rất quan trọng
**GitHub Pages chỉ là một trang tĩnh (static site)**. Vì vậy, hãy **chỉ sử dụng các công nghệ và cách triển khai phù hợp với static hosting**. Không đề xuất các công nghệ cần server runtime trực tiếp trên GitHub Pages như Node.js backend, Express, Next.js SSR, PHP, hoặc bất kỳ cơ chế nào yêu cầu xử lý backend chạy ngay trong GitHub Pages. Phần backend trung gian nếu cần thì chỉ dùng **Google Apps Script**.

## Kiến trúc bắt buộc
Chỉ dùng **một phương án duy nhất** sau đây và bám sát nó trong toàn bộ hướng dẫn:

- Website public hiện tại có **nút đăng nhập admin**
- Dùng **Google Sheets** để lưu:
  - 4–5 tài khoản admin
  - dữ liệu học viên
- Dùng **Google Apps Script** làm backend trung gian để:
  - xác thực đăng nhập
  - trả dữ liệu cho dashboard
- Khi đăng nhập thành công, chuyển sang trang **`/dashboard`** với URL cố định
- Dashboard chỉ hiển thị dữ liệu khi **token hợp lệ**
- Frontend phải là **HTML + CSS + JavaScript thuần**, hoặc thư viện frontend tải từ CDN nếu thực sự cần, nhưng vẫn phải chạy được trên **GitHub Pages static site**

## Yêu cầu UI/UX
Hãy thiết kế UI theo phong cách **admin dashboard hiện đại, gọn, chuyên nghiệp**, tham chiếu theo mẫu tôi đã cung cấp.

### Bố cục tổng thể
- Có **sidebar cố định bên trái**
- Có **topbar ở phía trên**
- Khu vực nội dung chính nằm bên phải
- Dashboard phải trông như một **business/admin panel**, không giống landing page

### Style bắt buộc
- Sidebar dùng tông **xanh navy đậm**
- Main content dùng nền **trắng hoặc xám rất nhạt**
- Card dùng nền sáng, **bo góc nhẹ**, **shadow mỏng hoặc viền mảnh**
- Màu nhấn chính là **xanh dương**, có thể dùng thêm **cyan/xanh ngọc nhạt**
- Typography sạch, hiện đại, dễ đọc
- Nhiều khoảng trắng, bố cục thoáng, tránh rối mắt
- Không dùng hiệu ứng nặng, không dùng gradient sặc sỡ, không làm kiểu quá màu mè

### Trang dashboard chính
Dashboard chính cần có:

- Góc trên bên phải có 2 nút:
  - **Xem danh sách học viên**
  - **Xem report**

- Có các ô thống kê hiển thị:
  - **Học viên đang học**
  - **Học viên đang chờ thi**
  - **Học viên nợ học phí**
  - **Học viên mới đăng ký tháng này**

### Trang danh sách học viên
- Hiển thị danh sách học viên rõ ràng, dễ nhìn
- Có bảng dữ liệu sạch, gọn
- Nên có các cột cơ bản như:
  - mã học viên
  - họ tên
  - khóa học / hạng xe
  - trạng thái học
  - tình trạng học phí
  - ngày đăng ký
- Ưu tiên bố cục dễ mở rộng sau này

### Trang report
- Lấy dữ liệu từ Google Sheets
- Vẽ **biểu đồ số lượng học viên đăng ký mới theo từng tháng trong năm**
- Có ô chọn **năm**
- Khi đổi năm, dữ liệu biểu đồ phải đổi tương ứng
- Trên trang report vẫn nên giữ các ô tóm tắt:
  - Học viên đang học
  - Học viên đang chờ thi
  - Học viên nợ học phí
  - Học viên mới đăng ký tháng này

## Yêu cầu trả lời
Hãy trả lời **theo đúng thứ tự sau**, ngắn gọn nhưng đủ để tôi triển khai ngay:

1. **Kiến trúc tổng thể**
2. **Cấu trúc Google Sheet cần tạo**
3. **Các API Google Apps Script cần có** và input/output của từng API
4. **Cấu trúc file frontend** cho GitHub Pages
5. **Luồng đăng nhập**, lưu token, kiểm tra token ở dashboard
6. **Thiết kế bố cục UI chi tiết** cho:
   - dashboard chính
   - trang danh sách học viên
   - trang report
7. **Style guide UI cụ thể**:
   - màu sắc
   - spacing
   - card style
   - sidebar style
   - button style
   - bảng dữ liệu
   - biểu đồ
8. **Mẫu code tối thiểu** cho:
   - Google Apps Script
   - HTML
   - CSS
   - JavaScript
9. **Cách deploy và test end-to-end**

## Ràng buộc
- Chỉ chọn **một phương án tối ưu duy nhất**
- Không đưa nhiều lựa chọn
- Không lan man
- Không bàn sâu về bảo mật
- Không phân tích lý thuyết dài dòng
- Tập trung vào **cách làm thực tế**
- Ưu tiên cách tổ chức code **gọn, dễ maintain, dễ copy dùng ngay**
- Tuyệt đối không đề xuất giải pháp trái với giới hạn của **GitHub Pages static hosting**

## Kỳ vọng đầu ra
Tôi muốn đầu ra đủ rõ để có thể:
- tạo Google Sheet
- tạo Apps Script
- tạo repo GitHub Pages mới
- triển khai dashboard admin mẫu
- xem được số liệu thống kê, danh sách học viên và report theo năm