# Procure UI V7 – Phân quyền hoàn chỉnh 8 tác nhân

## Nguyên tắc
- Một tài khoản có **một không gian nghiệp vụ hiệu lực** tại một thời điểm; với dữ liệu demo cũ, `requester` và `admin` được ưu tiên theo nguyên tắc quyền thấp nhất. Giám đốc chi nhánh có quyền phê duyệt theo đúng bước được phân công; không kế thừa vai trò trưởng phòng chỉ vì mảng `roles` có 2 mục.
- Không chỉ ẩn menu: cùng một hàm kiểm tra cho menu, router, chi tiết hồ sơ, phạm vi dữ liệu, báo cáo và hành động cập nhật.
- Tất cả các hồ sơ DRAFT đều riêng tư với người tạo, kể cả khi người xem là trưởng phòng hay Ban Giám đốc.
- Người tạo không tự phê duyệt; thẩm quyền theo tuyến duyệt, đơn vị, trạng thái và ủy quyền hợp lệ.
- Chỉ BOD có thể chọn **Toàn công ty**; các vai trò khác mặc định đúng khu vực/chi nhánh được giao.

## Ma trận quyền
| Vai trò | Màn hình chính | Phạm vi | Thao tác được phép | Không được phép |
|---|---|---|---|---|
| Nhân viên (`requester`) | Đề nghị của tôi, Lập đề nghị | Chỉ `createdById === currentUser.id` | Tạo, sửa/gửi nháp, theo dõi và điều chỉnh đề nghị của mình theo trạng thái | Dashboard, báo cáo, ngân sách, đề nghị người khác, phê duyệt |
| Trưởng phòng (`dept_head`) | Đề nghị của phòng, Hàng chờ duyệt, Thông báo | Một phòng ban thuộc chi nhánh | Xem đề nghị đã gửi của phòng và duyệt đúng bước được giao | Dashboard, báo cáo tổng hợp, dữ liệu phòng khác, tự duyệt |
| Tài chính (`finance`) | Tổng quan ngân sách, Kiểm tra nguồn, Quản lý/Điều chuyển nguồn, Báo cáo ngân sách | Một chi nhánh/khu vực được cấp | Kiểm tra nguồn; đề xuất chuyển; xác nhận giải phóng giữ dư | Tiếp nhận PO, ghi nhận mua hàng, nhập đối soát kế toán |
| Mua hàng (`procurement`) | Tổng quan mua hàng, Tiếp nhận & Thực hiện, Hồ sơ đã duyệt, Báo cáo mua hàng | Một chi nhánh/khu vực được cấp | Tiếp nhận hồ sơ đã duyệt, ghi nhận PO/cam kết | Xem đơn đang chờ duyệt, điều chỉnh ngân sách, ghi nhận chứng từ kế toán |
| Kế toán (`accountant`) | Tổng quan kế toán, Nhập & Đối soát, Hồ sơ đã duyệt, Báo cáo kế toán | Một chi nhánh/khu vực được cấp | Nhập chứng từ CSV, đối soát và ghi nhận chi phí | Đặt PO, chuyển nguồn, phê duyệt đề nghị |
| Giám đốc chi nhánh (`branch_director`) | Tổng quan chi nhánh, Hàng chờ phê duyệt, Đề nghị, Báo cáo | Chi nhánh phụ trách | Phê duyệt các bước được gán theo hạn mức, xem báo cáo chi nhánh | Duyệt hồ sơ người khác ở chi nhánh khác, dashboard toàn công ty |
| Ban Giám đốc (`bod`) | Tổng quan toàn công ty, Phê duyệt cấp cao, Đề nghị, Giám sát ngân sách, Báo cáo | HQ và tất cả chi nhánh | Phê duyệt bước cấp cao, duyệt/từ chối đề xuất chuyển nguồn; giám sát và tổng hợp | Thực hiện PO, nhập/ghi nhận kế toán, tạo đề xuất chuyển nguồn như Tài chính |
| Quản trị (`admin`) | Tài khoản & Phân quyền | Phạm vi quản trị đã cấp | Cấp 1 vai trò nghiệp vụ, khóa/kích hoạt tài khoản trong phạm vi, quản trị ủy quyền hợp lệ | Đọc dashboard, ngân sách, hồ sơ mua sắm; tự cấp BOD/admin; tự sửa quyền mình |

## Phân cấp phê duyệt
- Dưới 10 triệu đồng: cấp trưởng đơn vị trong tuyến duyệt.
- Từ 10 đến dưới 50 triệu đồng: giám đốc chi nhánh/cấp tương đương.
- Từ 50 triệu đồng trở lên: Ban Giám đốc.
- Chỉ người được phân công đúng bước, đúng chi nhánh/phòng ban mới được duyệt, không tự duyệt.

## Hạn chế quan trọng
Đây là mã nguồn **prototype frontend**, dữ liệu demo được lưu trong trình duyệt. Bộ quyền trên áp dụng tại tầng UI và React Context, **không phải bảo mật dữ liệu đa người dùng thực sự**. Muốn triển khai doanh nghiệp phải có backend kiểm tra RBAC/ABAC ở mọi API và lọc dữ liệu ngay truy vấn CSDL; xác thực thật, nhật ký kiểm toán, giao dịch ngân sách atomic. Không nhập thông tin kinh doanh thật vào bản demo.

## Kiểm thử
- 33/33 bài kiểm thử logic thành công (`npm run test:logic`).
- Kiểm tra cú pháp TypeScript/TSX: 33 file hợp lệ.
- Chưa chạy được Vite build và kiểm thử trình duyệt toàn bộ do môi trường thiếu npm dependencies và không truy cập được registry.npmjs.org.
