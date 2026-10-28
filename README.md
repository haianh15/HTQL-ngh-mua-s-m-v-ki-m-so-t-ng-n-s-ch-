# Procure UI – Bản sửa lỗi prototype V2

Ứng dụng React + Vite + TypeScript, giao diện giữ theo Design System v1.0 của người dùng.

## Chạy trên máy

Yêu cầu: Node.js 22 trở lên, npm và kết nối Internet để cài thư viện lần đầu.

```bash
npm install
npm run dev
```

Mở `http://localhost:3000` trong trình duyệt. Build: `npm run build`.

Trên Windows có thể chạy `run_windows.bat` trong thư mục mã nguồn.

## Tài khoản thử nghiệm

- Tài khoản: lựa chọn trong vùng “Thử nghiệm nhanh theo vai trò” tại trang đăng nhập.
- Mật khẩu demo: `Procure@2026`.
- Mã MFA demo: `123456` cho tài khoản cần MFA.
- Không phải dịch vụ xác thực thật. Tài khoản mẫu chỉ nhằm kiểm thử giao diện.

## Kiểm thử logic nghiệp vụ (không cần npm install)

```bash
node --test tests/finance.test.cjs
```

Bộ kiểm thử bao gồm: ngân sách 100/70/50, chuyển giữ→cam kết→sử dụng, kiểm tra giải phóng, chuyển nguồn, phân quyền phê duyệt, phạm vi chi nhánh và phiên bản hiệu lực. File JS tại `.test-build/` là phiên bản TypeScript đã biên dịch để thử offline.

## Thay đổi chính

- Đăng nhập mặc định bị đóng, mật khẩu demo và OTP demo phải khớp chính xác; hết phiên giao diện sau 30 phút không hoạt động.
- Giới hạn dữ liệu hiển thị theo vai trò, đơn vị và chi nhánh; thay đổi vai trò yêu cầu đăng xuất.
- Thêm lưu cục bộ dữ liệu demo trên localStorage, làm mới trang không mất ngay dữ liệu (không đồng bộ giữa máy).
- Cho sửa/lưu/gửi lại bản nháp, tách bản sửa đổi chưa duyệt khỏi bản đã duyệt có hiệu lực.
- Kiểm tra người phê duyệt đúng bước, không duyệt phiếu của chính mình, xét phạm vi ủy quyền.
- Không tự giải phóng phần tiền mua chưa dùng: giữ lại đến khi Tài chính xác nhận.
- Chặn đặt hàng/đối soát vượt cam kết, tái kiểm tra nguồn khi duyệt chuyển ngân sách.
- Nhập CSV kế toán từ file thật, kiểm tra số hóa đơn trùng, mã PR và phần cam kết còn lại trước khi ghi nhận.
- Báo cáo có thể tải CSV UTF-8 để mở trong Excel và in/lưu PDF bằng hộp thoại trình duyệt.
- Tệp đính kèm mới có nội dung (data URL) lưu cục bộ với giới hạn 1 MB/tệp.
- Các kịch bản trong UI được ghi đúng là mô phỏng, không mạo nhận kiểm thử tự động.

## Giới hạn quan trọng

**Đây vẫn là prototype dùng dữ liệu localStorage.** Không có cơ sở dữ liệu chung, không có xác thực/mã OTP gửi qua server, không có giao dịch giữ ngân sách nguyên tử đa người dùng. KHÔNG sử dụng dữ liệu thật hoặc triển khai vận hành doanh nghiệp. Muốn dùng thật cần bổ sung backend, lưu file server/object storage, authentication MFA và giao dịch ngân sách trong database.

Xuất Excel `.xlsx` và nhập `.xlsx` chưa được hỗ trợ; bản hiện tại xuất/nhập **CSV**, có thể mở/chỉnh sửa bằng Excel. Chức năng đổi/khôi phục mật khẩu thật đang khóa để không báo sai là đã đổi. Một số cấu hình như phân bổ ngân sách đầu năm đầy đủ vẫn cần triển khai nghiệp vụ backend.

**Lưu ý môi trường tạo bản sửa:** Không thể chạy Vite và kiểm thử browser E2E tại môi trường này do không tải được dependencies npm từ registry (DNS). Đã kiểm tra cú pháp 33 file TypeScript/TSX và chạy 8 bài test độc lập cho các quy tắc tài chính. Hãy chạy `npm install && npm run dev` trên máy có Internet để kiểm thử giao diện toàn luồng.

## Bản cập nhật V3 — Quyền theo chức danh và khu vực (28/10/2026)

Xem `PHAN_QUYEN_V3.md` để biết toàn bộ ma trận quyền. Điểm thay đổi chính:
- Nhân viên đề nghị: vào `Đề nghị mua sắm` ngay sau login, không còn dashboard, ngân sách và báo cáo; chỉ xem phiếu của mình.
- Trưởng phòng: vào `Hàng chờ phê duyệt`; xem phiếu thuộc phòng ban và các yêu cầu cần duyệt, không có dashboard toàn công ty.
- Tài chính / Mua hàng / Kế toán: dashboard, hồ sơ và báo cáo của **khu vực được gán**. Tài khoản HQ không còn mặc định truy cập năm chi nhánh.
- Giám đốc chi nhánh: chỉ vùng chi nhánh của mình.
- Ban Giám đốc (`bod`): có thể xem toàn công ty và chọn bộ lọc HQ / 5 chi nhánh.
- Quản trị viên: mặc định chỉ màn quản trị, danh sách người dùng khu vực mình quản lý; không có quyền xem ngân sách toàn công ty.
- Khi người dùng truy cập trang không thuộc vai trò, router hiển thị 403 và dữ liệu danh sách cũng bị lọc theo vai trò.

**Khác biệt quan trọng:** đây vẫn là bản React prototype dùng `localStorage` và tài khoản demo; backend production phải áp dụng cùng quy tắc trên mỗi API và chỉ trả về dữ liệu đúng khu vực. Không thể xem frontend là biện pháp bảo vệ dữ liệu an toàn.

**Cập nhật GitHub bằng Windows:** giải nén ZIP, nhấp đúp `CAP_NHAT_GITHUB_WINDOWS.bat` (yêu cầu Git for Windows và quyền push). File thực hiện clone repository hiện có, chép mã nguồn mới rồi tạo commit trên nhánh `main`.

**Kiểm tra logic:** `npm run test:logic`. **Chạy web:** `npm install`, `npm run dev`. **Build production:** `npm run build`.
