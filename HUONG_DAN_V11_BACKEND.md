**CẬP NHẬT V11.1:** Mã `server/lib/supabase.js` đã hỗ trợ khóa mới Supabase `sb_publishable_...` và `sb_secret_...`; không gửi khóa `sb_secret_...` vào header Bearer. Các tên biến môi trường trong mã được giữ nguyên để tương thích.

# Procure UI V11 — Backend Gemini thực và xác thực Supabase

**TRẠNG THÁI:** Đã có mã backend và frontend tích hợp 4 lời gọi Gemini. Chưa triển khai hoặc xác nhận cuộc gọi thật vì chưa cấu hình dự án Supabase/Gemini của bạn. Kiểm thử API với dịch vụ giả lập: 15/15 đạt. `npm install` trong môi trường xây dựng bị timeout, nên chưa xác nhận Vite build hoàn chỉnh.

## 1. Có những gì?

- `api/ai/check.js`: Gemini rà soát phiếu, đối chiếu đề nghị tương tự ở Supabase theo chi nhánh/phòng ban. Nhân viên **không được nhận ID, tên, số tiền** của đề nghị người khác, chỉ nhận cảnh báo chung.
- `api/ai/assist.js`: Gemini gợi ý viết mục đích và thông số; không tự lưu vào phiếu.
- `api/ai/approval.js`: Gemini tóm tắt phiếu với kiểm tra quyền ở máy chủ; cấm người tạo tự đánh giá phê duyệt.
- `api/ai/budget.js`: Gemini phân tích ảnh chụp số liệu ngân sách; chỉ Tài chính/Ban Giám đốc. Không suy đoán xu hướng nếu chưa đủ dữ liệu lịch sử.
- `api/ai/sync-request.js`: người tạo chủ động gửi bản chụp nội dung phiếu lên bảng AI để tìm trùng và tóm tắt; bảng này **không phải dữ liệu nghiệp vụ chính thức**.
- `api/ai/sync-budgets.js`: Tài chính chủ động đồng bộ ảnh chụp ngân sách thuộc chi nhánh của mình. Không cập nhật ngân sách chính thức.
- `api/ai/me.js`: xác minh token và lấy vai trò, chi nhánh, phòng ban từ **Supabase**.
- `api/health.js`: kiểm tra API đã có biến môi trường hay chưa (chỉ bool, không hiển thị khóa).
- `server/lib/`: kiểm tra quyền, hạn mức gọi API, dữ liệu đầu vào và gọi Gemini; không nằm dưới api/ nên không bị coi là endpoint.
- `database/supabase_ai.sql`: bảng profile, bản chụp đề nghị, bản chụp ngân sách và giới hạn 10 yêu cầu/người/phút.

## 2. Cấu hình trước khi dùng (bắt buộc)

1. Tạo **Supabase Project** tại https://supabase.com. Vào **SQL Editor**, chạy toàn bộ `database/supabase_ai.sql`.
2. Vào **Authentication → Users**, tạo người dùng bằng email thật mà bạn kiểm soát và mật khẩu riêng; không dùng mật khẩu demo chung.
3. Gán user Supabase vừa tạo vào `public.procure_ai_profiles`. Ví dụ sau khi thay email và vai trò phù hợp:

```sql
insert into public.procure_ai_profiles
(auth_uid,user_code,email,display_name,role,branch_id,department_id,active)
select id,'usr_requester',email,'Nguyễn Minh Anh','requester','HQ','DEP_PROD_HQ',true
from auth.users where email='minhanh.nguyen@procure.vn';
```

**Lưu ý:** email trong dữ liệu mẫu `@procure.vn` chỉ là giả định. Bạn phải tạo user đó trong Supabase Auth trước, hoặc thay bằng email do mình kiểm soát. Với vai trò Tài chính, tạo ít nhất 2 tài khoản độc lập nếu cần kiểm soát không tự duyệt.

4. Lấy **Gemini API key** tại https://aistudio.google.com (có thể phát sinh chi phí theo hạn mức). API key chỉ lưu vào Environment Variables của Vercel, không đưa vào GitHub.
5. Trong **Vercel → Project → Settings → Environment Variables**, thêm 7 biến như mẫu `.env.example` (trên Vercel có thể dùng cùng giá trị cho `SUPABASE_URL` / `VITE_SUPABASE_URL`, và `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`).
   - `SUPABASE_URL`, `SUPABASE_ANON_KEY`: máy chủ xác thực người dùng. Giá trị `SUPABASE_ANON_KEY` có thể là khóa **publishable** mới `sb_publishable_...`.
   - `SUPABASE_SERVICE_ROLE_KEY`: khóa **bí mật, chỉ server** (`sb_secret_...` hoặc legacy service_role), tuyệt đối không đặt tiền tố `VITE_`. Giữ nguyên tên biến này trong V11.1 dù Supabase gọi nó là Secret Key.
   - `GEMINI_API_KEY`: khóa **bí mật, chỉ server**, tuyệt đối không đặt tiền tố `VITE_`.
   - `GEMINI_MODEL`: ví dụ `gemini-2.5-flash`, có thể thay bằng model hiện được tài khoản của bạn cấp quyền.
   - `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`: thông tin công khai cho trình duyệt để đăng nhập Supabase (không bao giờ dùng khóa secret/service_role).
6. Đẩy các file lên nhánh GitHub `main` đang kết nối Vercel, giữ **Root Directory = `./`** và Framework Preset = **Vite**. Để Vercel build lại.
7. Mở `https://<your-domain>/api/health`, cần `status:ok`, `modelConfigured:true`, `authConfigured:true`.
8. Đăng nhập bằng tài khoản Supabase ở bước 2. Kiểm tra nút AI tại **Lập đề nghị**, **Chi tiết đề nghị** và **Quản lý ngân sách**.

## 3. Phạm vi dữ liệu, phân quyền và nguyên tắc an toàn

- Backend xác minh **Authorization Bearer** token với Supabase Auth rồi đọc `procure_ai_profiles` qua server; không tin `role` hoặc `branchId` do client gửi. Phân quyền 8 vai trò giữ nguyên, không có quyền truy cập dữ liệu toàn công ty trừ `bod`.
- Nhân viên chỉ được xem/lập phiếu của mình ở màn hình; server chỉ trả dấu hiệu **có trùng**, không trả ID hoặc mô tả phiếu của đồng nghiệp.
- Tài chính, Mua hàng, Kế toán theo chi nhánh, phòng ban theo quyền được cấp. Mua hàng không được dùng endpoint AI ngân sách.
- API AI là **read-only đối với dữ liệu kinh doanh**. AI không thể duyệt, từ chối, đặt hàng, giữ tiền, chuyển tiền hoặc ghi chi phí.
- Phần nội dung phiếu/nguồn gửi tới Gemini là dữ liệu được người dùng chủ động yêu cầu phân tích. **Không gửi tệp đính kèm, hóa đơn PDF, số tài khoản, mật khẩu hoặc service role key cho Gemini**.
- API giới hạn 10 lượt/người/phút. Vẫn cần giám sát quota chi phí tại Google AI Studio và thiết lập chính sách bảo vệ dữ liệu doanh nghiệp.

## 4. Giới hạn cần biết trước khi đưa vào doanh nghiệp

1. Mã nguồn V10 dùng React state/localStorage cho nghiệp vụ; bản V11 **chưa chuyển toàn bộ hồ sơ, phê duyệt, ngân sách, sổ cái sang cơ sở dữ liệu giao dịch**. Các số tiền/nghiệp vụ hiển thị trên web vẫn demo, không an toàn cho quyết định chi tiền.
2. Bản chụp dữ liệu trong `procure_ai_requests`/`procure_ai_budgets` nhằm cung cấp ngữ cảnh cho AI, do UI gửi lên; **không xác thực được trạng thái phê duyệt hay số dư chính thức**. Muốn dùng dữ liệu thật cần tích hợp backend quy trình mua sắm/ledger nguyên tử và migration dữ liệu.
3. Hồ sơ mẫu có sẵn trên trình duyệt **không tự xuất hiện trong Supabase**. Chỉ các đề nghị được tạo/đồng bộ sau khi đăng nhập mới có thể được backend AI phát hiện và tóm tắt. Không tự động tải toàn bộ hồ sơ demo của người khác lên cơ sở dữ liệu.
4. Đăng nhập mật khẩu được xác minh bởi Supabase. **MFA thực (TOTP/AAL2), đặt lại/đổi mật khẩu hoàn chỉnh, phân quyền quản trị người dùng tại máy chủ và kiểm thử xâm nhập vẫn cần triển khai** trước khi có dữ liệu thật. OTP `123456` demo cũ không được sử dụng cho API AI.
5. Vercel Functions chỉ hoạt động khi deploy qua Vercel hoặc `vercel dev`. Chạy `npm run dev` chỉ khởi động Vite frontend, sẽ không phục vụ các endpoint trong `/api`.
6. Không công bố website cho nhân viên thật trước khi hoàn thiện các mục bảo mật và dữ liệu nghiệp vụ trên.

## 5. Kiểm thử

```bash
npm install
npm run test:backend
npm run test:logic
npm run test:ai
npm run build
```

Kiểm thử backend mock API: **15/15 đạt** với Node.js 22. Các file TypeScript/TSX đã được kiểm tra cú pháp. Chưa chạy được `npm run build` vì môi trường biên soạn không tải được dependency npm, và chưa test kết nối tới Gemini/Supabase thật do thiếu credentials.

## 6. Tham chiếu kỹ thuật

- https://ai.google.dev/api/generate-content
- https://supabase.com/docs/reference/javascript/auth-getuser
- https://vercel.com/docs/frameworks/frontend/vite

