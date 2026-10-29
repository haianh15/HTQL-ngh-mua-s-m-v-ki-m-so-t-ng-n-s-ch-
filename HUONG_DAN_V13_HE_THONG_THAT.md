# Procure UI V13 — Chuyển dữ liệu nghiệp vụ từ demo sang Supabase

**Trạng thái bản giao:** Mã nguồn ứng viên để chạy thử trong staging; **chưa được đưa vào production**, chưa chạy migration hoặc kiểm thử cơ sở dữ liệu thật. Không coi đây là xác nhận nghiệm thu, tuân thủ tài chính hay sẵn sàng vận hành công ty.

## Khác biệt với V12

- Giữ cơ chế đăng nhập Supabase Auth và bảng hồ sơ quyền `procure_ai_profiles` của 8 người dùng đã có. Vẫn dùng Vercel và Gemini.
- Dữ liệu mua sắm, trạng thái phê duyệt, ngân sách, cam kết, chứng từ kế toán, thông báo và nhật ký V13 không khởi tạo từ `INITIAL_*`, không lưu `localStorage` và không ghi qua nút đồng bộ ảnh chụp AI.
- Browser gọi API `GET /api/ops/state` và `POST /api/ops/mutate`; máy chủ luôn kiểm tra token, lấy UID từ Supabase rồi gọi các stored procedures private `procure_v13_state` và `procure_v13_mutate`.
- Phân quyền lọc ở SQL cho người lập, người duyệt được chỉ định/ủy quyền, Mua hàng, Kế toán. Không thể sửa `role` hoặc `branch` bằng request ở trình duyệt để đổi quyền.
- Các giao dịch **duyệt cuối/giữ ngân sách**, **đặt hàng/chuyển giữ sang cam kết**, **đối soát/chuyển cam kết sang đã sử dụng**, **điều chuyển ngân sách** chạy bằng một transaction trong PostgreSQL với `FOR UPDATE`. Ghi bảng ledger và audit.
- Chặn import hóa đơn trùng bằng unique constraint; mỗi lần xác nhận đối soát kiểm tra lại chứng từ và số tiền cam kết, không tin trạng thái preview.
- Ngân sách đang thiếu có thể được Finance kiểm tra lại và đưa về người duyệt cuối, không được tự động duyệt chỉ vì có thêm nguồn.
- Mô phỏng/reset dữ liệu demo, đồng bộ snapshot demo và upload tệp dạng data URL bị khóa trên giao diện V13.

## Để triển khai STAGING an toàn (theo đúng thứ tự)

1. **Không đẩy ngay lên `main`**. Sao lưu Supabase hiện có; tốt nhất dùng Supabase project STAGING độc lập với Auth, không dùng dữ liệu ngân sách thật để thử.
2. Mở Supabase **SQL Editor** của STAGING. Chạy nguyên file `database/V13_PRODUCTION.sql`. Thực thi thành công mới tiếp tục. Đọc danh sách table/function mới qua Table Editor. Migration không xóa hoặc đổi các bảng AI V11.
3. Tạo các tài khoản Auth và bản ghi `procure_ai_profiles` trong STAGING, đúng UID thực tế, `active=true`, role/branch/department tương ứng. Người duyệt cần có mặt ở cùng chi nhánh/phòng; nếu thiếu hệ thống sẽ từ chối nộp thay vì cho duyệt sai.
4. Nhập **hạn mức ngân sách đã được phê duyệt** vào bảng `procure_v13_budgets`. Tham khảo cột trong `database/MAU_NGAN_SACH_THAT.csv`. Giá trị *allocated* phải có chứng cứ nguồn; các cột held, committed, used ban đầu đặt 0 nếu khởi tạo hệ thống trống. **Không sao chép số ví dụ V12** và không đặt tiền thực nếu chưa đối soát số dư ban đầu.
5. Chạy `CAP_NHAT_GITHUB_V13_WINDOWS.bat` để tạo nhánh **`feature/procure-v13-real`** trên GitHub, KHÔNG ghi đè `main`. Review Git diff trước khi nhập Y. Vercel Preview phải trỏ tới Supabase STAGING, thiết lập cả 7 biến môi trường tương ứng cho Preview; API key service role chỉ đặt ở server Vercel, không bao giờ có tiền tố `VITE_`.
6. Khi Preview có trạng thái Ready, thử `GET /api/ops/state` **đã đăng nhập**; nếu mở trình duyệt không token, phải trả 401. Không dùng `/api/health` làm bằng chứng đã chạy nghiệp vụ — endpoint này chỉ kiểm tra biến env.
7. Kiểm thử nhiều trình duyệt: A tạo PR, B duyệt Trưởng phòng, C duyệt Tài chính, D duyệt cuối và giữ nguồn, Mua hàng ghi PO, Kế toán import CSV và commit, Finance điều chuyển và xử lý `WAITING_FUNDS`.
8. Phải vượt qua danh sách kiểm thử ở dưới, rồi mới merge `main`/áp dụng SQL lên production sau khi có sao lưu và phương án rollback. **Không đổi site hiện tại khi chưa có kết quả.**

## Bảng ngân sách bắt buộc

Các trường: `id,name,fiscal_year,branch_id,department_id,department_name,category,category_name,allocated,adjustments,held,committed,used`. Với dữ liệu mới hoàn toàn, nên bắt đầu `adjustments=held=committed=used=0`; `allocated` do người có thẩm quyền phê duyệt. Nếu có số dư chuyển tiếp, cần giải trình đối chiếu; migration hiện **không tự chuyển số dư lịch sử**.

## Checklist kiểm thử nghiệm thu tối thiểu

- [ ] Người tạo chỉ xem đề nghị của chính họ trên máy khác.
- [ ] Trưởng phòng đúng người được phân công mới thấy hồ sơ; đồng nghiệp cùng vai trò không xem được.
- [ ] Đến bước Tài chính, Trưởng phòng không còn thấy hồ sơ trong hàng chờ.
- [ ] Người lập không duyệt chính mình; BOD không xem toàn bộ PR không cần duyệt.
- [ ] Đăng nhập sai/thẻ token hết hạn bị từ chối; tài khoản active=false không đăng nhập được.
- [ ] 2 người duyệt cuối đồng thời không thể giữ trùng ngân sách; hồ sơ thiếu nguồn đi `WAITING_FUNDS`.
- [ ] `BUDGET_RECHECK` chỉ trả về hàng chờ khi đủ nguồn, KHÔNG tự động APPROVED.
- [ ] Chuyển từ Held -> Committed -> Used không làm trừ khả dụng hai lần.
- [ ] PO tổng đặt không thể vượt phần đề nghị đã duyệt; nhập trùng hóa đơn bị chặn.
- [ ] Hóa đơn có giá trị vượt cam kết phải bị chặn toàn bộ batch.
- [ ] Tài khoản Finance chi nhánh A không thể điều chuyển nguồn chi nhánh B.
- [ ] Chỉ Admin hợp lệ được đổi vai trò, không thể tự cấp quyền BOD/Admin.
- [ ] Kiểm thử tải/độ trễ, giữ backup và kiểm tra tính nhất quán ledger.

## Các hạng mục CHƯA đạt mức production hoàn chỉnh

1. **Upload/đọc tệp đính kèm**: giao diện bị khóa an toàn vì cơ chế V12 chỉ giữ data URL; cần Supabase Storage private bucket, kiểm tra nội dung/mime, URL có hạn dùng và quét file. KHÔNG bảo người dùng đã gửi báo giá nếu chưa có Storage.
2. **MFA cho cấp duyệt**: giao diện OTP cũ là demo, V13 chưa có luồng Supabase MFA/TOTP enrollment, login AAL2. Không dùng UI này để làm bằng chứng MFA thật. Cần triển khai trước khi áp chính sách MFA của đơn vị.
3. **Khôi phục/đổi mật khẩu** đang không cung cấp trên giao diện; thực hiện qua Supabase Auth hoặc hoàn thiện chức năng email reset với cấu hình SMTP.
4. **Tính năng nhập hạn mức đầu năm**, báo cáo chốt sổ, điều chỉnh ngược chứng từ, chính sách lưu trữ/xóa dữ liệu, thông báo email và backup định kỳ cần quy trình vận hành được phê duyệt. CSV kế toán được parse theo dòng và chưa hỗ trợ đầy đủ multiline quoted fields.
5. **Đã thử unit/backend tests cục bộ** nhưng chưa chạy thử transaction SQL thật, chưa có QA tích hợp trên Vercel Preview. Build React cũng cần `npm install` trong môi trường có internet do container không cài được dependencies.
6. **Khả năng mở rộng**: state hiện tải danh sách có quyền theo một lần gọi, chưa có phân trang; cần tối ưu để vận hành thực tế 600+ người dùng.
7. **Audit IP** hiện chưa thu thập IP xác thực; chỉ lưu người thao tác, mốc giờ, action. Cần tăng cường theo chính sách bảo mật.

**Tóm lại:** V13 đã có backend và giao dịch doanh nghiệp thật ở dạng mã nguồn **chờ triển khai/kiểm chứng**. V12 trên `main` vẫn chạy như cũ. Không đưa V13 vào hoạt động tài chính chính thức trước khi giải quyết các mục còn thiếu và hoàn tất QA.
