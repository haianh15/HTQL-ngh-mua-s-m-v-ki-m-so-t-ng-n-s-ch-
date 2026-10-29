# Procure UI V12 — Đăng nhập gọn hơn & phân quyền theo người đang đến lượt duyệt

## Thay đổi chính

1. `api/auth/login.js` (MỚI): frontend chỉ gọi một API của hệ thống để backend xác thực mật khẩu với Supabase và lấy hồ sơ phân quyền. Trước đó trình duyệt gọi Supabase rồi `/api/ai/me` (server lại gọi Supabase xác minh token và hồ sơ quyền). Đường mới tiết kiệm các bước xác minh/round trip ở lần đăng nhập. Phiên và vai trò chỉ lấy từ Supabase; không lấy theo vai trò do người dùng gửi. **Tốc độ thực tế vẫn tùy kết nối và vùng triển khai Supabase/Vercel**.
2. `src/services/aiApi.ts`: chuyển login sang API gộp, đặt timeout rõ ràng; đăng xuất ngay ở trình duyệt trước khi gọi API để tránh phiên logout cũ xóa phiên login mới.
3. `src/components/auth/LoginForm.tsx`: hiển thị trạng thái khi chờ và thông báo rõ nếu kết nối chậm. Không đổi tài khoản hay khóa API.
4. `src/domain/rules.ts` + `src/types/index.ts`: xác minh đúng *người được phân công*, *vai trò*, *chi nhánh/phòng ban*, *bước đang chờ*. Trưởng phòng, Tài chính, Giám đốc chi nhánh, BOD chỉ thấy đề nghị **đến lượt mình duyệt**, cộng đề nghị do chính mình lập. Không còn nhìn toàn bộ đơn người khác chỉ do cùng cấp quản lý. Ủy quyền hợp lệ được kiểm tra riêng; không tự duyệt đơn của mình.
5. `src/context/AppContext.tsx`, `src/App.tsx`, `src/views/*`: danh sách, dashboard, hàng chờ và quyền mở trang chi tiết dùng cùng bộ lọc. Loại tab "Đã xử lý" khỏi hàng chờ nghiêm ngặt (không giữ quyền xem đơn người khác sau khi chuyển bước).
6. `server/lib/supabase.js`: chặn AI phân tích hồ sơ người khác khi không ở đúng bước duyệt phù hợp vai trò/chi nhánh.

## Cập nhật lên trang đang chạy

Giữ nguyên **7 biến môi trường đã thiết lập** trên Vercel `-36gv`, không cần tạo khóa mới, không phải chạy SQL migration.

1. Giải nén bản `Chi_File_Can_Sua`.
2. Chạy `CAP_NHAT_GITHUB_V12_WINDOWS.bat` trên Windows đã cài Git. Công cụ clone bản `main` mới nhất, chỉ chép các file cần sửa, cho xem danh sách thay đổi, hỏi xác nhận `Y` trước khi commit và push. Không force-push.
3. Nếu GitHub của bạn đã kết nối Vercel `-36gv`, theo dõi **Deployments** tới trạng thái **Ready**. Nếu không tự triển khai, kiểm tra kết nối GitHub → Vercel rồi Redeploy dựa trên commit mới.
4. Tải lại website (Ctrl + Shift + R). Thử đăng nhập; lần đầu sau deploy có thể chậm do serverless cold start.
5. Dùng tài khoản Nhân viên đề nghị tạo/gửi, rồi đăng nhập người được phân công cho bước kế tiếp. Kiểm tra Trưởng phòng chỉ thấy đúng đề nghị đang tới lượt mình; sau khi Trưởng phòng duyệt, hồ sơ phải chuyển sang Tài chính và biến mất khỏi hàng chờ của Trưởng phòng. Kiểm tra tiếp các vai trò theo quy trình.

## Giới hạn quan trọng

**Bản này chưa chuyển toàn bộ nghiệp vụ mua sắm lên Supabase.** Dữ liệu PR/duyệt trong frontend hiện vẫn lưu ở localStorage của từng trình duyệt (bản demo). Do đó giao diện sẽ lọc đúng theo quyền nhưng dữ liệu giữa các trình duyệt/người dùng chưa bảo đảm đồng bộ; không thể xem lọc frontend là bảo mật dữ liệu production. Dữ liệu snapshot `procure_ai_requests` chỉ phục vụ AI; không phải cơ sở dữ liệu giao dịch chính thức.

Để vận hành dùng thật nhiều người, phải xây dựng API đọc/ghi/phê duyệt PR có xác thực phía server, bảng phân công reviewer, kiểm soát quyền tại từng API và giao dịch chuyển trạng thái nguyên tử trong database, không phụ thuộc vào dữ liệu localStorage. Bản này chưa thay thế giai đoạn đó.

## Kiểm thử thực hiện trong môi trường dựng

- 59 phép kiểm thử domain/RBAC và backend cũ, gồm tình huống ủy quyền, đúng người duyệt, các bước duyệt, các vai trò.
- 3 phép kiểm thử backend đăng nhập mới và các đường lỗi (tổng 62 trường hợp đã chạy). 
- Kiểm tra cú pháp TypeScript/TSX.
- Chưa xác thực end-to-end bằng Supabase/Gemini thật hoặc đo thời gian trên môi trường Vercel của bạn. Không đưa API keys vào tệp mã nguồn.
