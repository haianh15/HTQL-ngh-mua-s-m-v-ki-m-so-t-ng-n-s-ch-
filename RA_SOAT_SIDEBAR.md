# Rà soát menu Procure UI

Nguyên tắc: sidebar chứa **không gian công việc chính**, không chứa từng thao tác nghiệp vụ. Phân quyền không thay đổi.

| Vai trò | Sidebar | Chức năng được chuyển vào bên trong |
|---|---|---|
| Nhân viên | Đề nghị của tôi | Lập đề nghị ngay trong danh sách |
| Trưởng phòng | Chờ tôi duyệt · Đề nghị liên quan | Chi tiết/duyệt trong hàng chờ |
| Tài chính | Tổng quan · Chờ kiểm tra · Ngân sách | Tra cứu/lập đề nghị, báo cáo từ Tổng quan; điều chuyển, sổ ngân sách, chờ nguồn theo tab Ngân sách |
| Mua hàng | Tổng quan · Thực hiện mua sắm | Tra cứu hồ sơ từ Thực hiện; báo cáo từ Tổng quan |
| Kế toán | Tổng quan · Đối soát chứng từ | Tra cứu hồ sơ từ Đối soát; báo cáo từ Tổng quan |
| Giám đốc chi nhánh | Tổng quan · Chờ tôi duyệt | Tra cứu/lập đề nghị và báo cáo từ Tổng quan |
| Ban Giám đốc | Tổng quan · Chờ tôi duyệt · Ngân sách | Tra cứu/lập đề nghị, báo cáo từ Tổng quan; điều chuyển từ Ngân sách |
| Quản trị | Quản trị hệ thống | Tài khoản, phân quyền, ủy quyền, nhật ký theo tab |

- **Thông báo**: chỉ biểu tượng chuông trên header.
- **Đăng xuất**: nút trên header, không phải đổi tài khoản.
- **Các màn hình chi tiết**: tiếp tục đi từ danh sách, hàng chờ và thông báo theo quyền đã có.
- **Kiểm thử**: logic, AI, backend và các kiểm thử menu (bao gồm toàn bộ 8 vai trò).
- **Chưa kiểm thử UI thực tế**: chưa cài dependencies/build Vite trong môi trường hiện tại.
