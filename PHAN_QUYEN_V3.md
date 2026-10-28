# Ma trận phân quyền Procure UI – V3 (theo yêu cầu mới)

| Vai trò | Màn hình khởi động | Dashboard | Phạm vi hồ sơ | Phạm vi ngân sách | Phê duyệt | Báo cáo |
|---|---|---|---|---|---|---|
| Nhân viên đề nghị | Đề nghị mua sắm | Không | Chỉ hồ sơ do chính mình tạo | Chỉ tên nguồn gắn với phòng ban, không hiện số dư | Không | Không |
| Trưởng phòng | Hàng chờ phê duyệt | Không | Hồ sơ thuộc phòng ban (và của mình) | Chỉ thông tin tại bước phê duyệt | Có, đúng phòng ban/bước | Không |
| Giám đốc chi nhánh | Dashboard chi nhánh | Có, chỉ chi nhánh mình | Chi nhánh được giao | Chỉ tại chi nhánh, qua phạm vi quyền nghiệp vụ | Có, đúng cấp | Có, chỉ chi nhánh |
| Tài chính | Dashboard khu vực | Có, chỉ khu vực được giao | Khu vực được giao | Khu vực được giao | Kiểm tra tài chính | Có, chỉ khu vực |
| Mua hàng | Dashboard khu vực | Có, chỉ khu vực được giao | Khu vực được giao | Tổng quan phạm vi khu vực | Không | Có, chỉ khu vực |
| Kế toán | Dashboard khu vực | Có, chỉ khu vực được giao | Khu vực được giao | Tổng quan phạm vi khu vực | Không | Có, chỉ khu vực |
| Ban Giám đốc / Tổng giám đốc | Dashboard toàn công ty | Có, toàn HQ và 5 CN | Toàn công ty | Toàn công ty | Có, theo hạn mức | Có, toàn công ty |
| Quản trị hệ thống | Quản trị | Không mặc định | Không có quyền đọc đề nghị theo nghiệp vụ | Không có quyền xem báo cáo tài chính | Không | Không |

## Kiểm soát
- Sidebar và router cùng dùng các quy tắc `canAccessScreen`, dữ liệu hồ sơ cùng dùng `canReadRequest`, khu vực dùng `canSeeBranch`.
- Chỉ vai trò `bod` được chọn phạm vi `ALL`.
- Đây là prototype React lưu dữ liệu phía trình duyệt, không bảo đảm bảo mật thật: cần backend xác thực/ủy quyền và lọc dữ liệu **trước khi trả về** cho client. Tránh dùng localStorage lưu dữ liệu của nhiều chi nhánh trong bản production.
- Tài khoản thử nghiệm đã được gán sẵn vai trò/chi nhánh trong dữ liệu seed.
