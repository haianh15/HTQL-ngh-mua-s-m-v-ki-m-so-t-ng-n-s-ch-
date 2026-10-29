**LƯU Ý: Đây là tài liệu lịch sử của bản V10, không mô tả các API V11. Xem README.md và HUONG_DAN_V11_BACKEND.md.**

# PROCURE UI V10 — TÍCH HỢP 4 TÍNH NĂNG HỖ TRỢ THÔNG MINH (DEMO)

## Căn cứ và trạng thái
- Dựa trên source `HTQL-ngh-mua-s-m-v-ki-m-so-t-ng-n-s-ch--main(3).zip` do người dùng gửi.
- Đây là bản chạy trực tiếp trong React bằng **quy tắc có thể kiểm thử**, **KHÔNG phải mô hình ngôn ngữ Gemini/OpenAI đã được gọi**.
- Không gửi tài liệu, ngân sách hoặc dữ liệu nhân viên sang dịch vụ AI bên ngoài. Không sử dụng API key trong trình duyệt.
- Không thay đổi tuyến duyệt V9, trạng thái hồ sơ, công thức ngân sách hay quyền của 8 vai trò.

## 1. Kiểm tra đề nghị (ưu tiên rất cao)
**Màn hình:** Lập đề nghị mới / sửa bản nháp (`src/views/CreateEditPRView.tsx`).

- Kiểm tra tên, mục đích, nguồn, ngày cần, tên/số lượng/đơn giá/thông số và việc có chứng từ kèm theo.
- Tìm hồ sơ trùng dựa trên từ khóa tên hàng, mô tả, tên đề nghị. Chỉ so sánh các bản ghi **đã được AppContext cho phép người dùng xem**, cùng chi nhánh và phòng ban; không tiết lộ hồ sơ của người khác cho tài khoản nhân viên.
- Trước khi gửi, chạy kiểm tra trên dữ liệu mới nhất. Nếu có cảnh báo thì hiển thị kết quả và yêu cầu người dùng xác nhận muốn tiếp tục; AI **không tự từ chối**, và thay đổi nội dung sau cảnh báo sẽ phải xác nhận lại.

**GIỚI HẠN QUAN TRỌNG:** Nhân viên có quyền xem hồ sơ của mình, vì vậy demo **không thể dò trùng hồ sơ của nhân viên khác**. Muốn cảnh báo trùng xuyên người dùng mà không lộ dữ liệu phải xây dựng endpoint backend có xác thực và chỉ trả về tín hiệu phù hợp quyền.

## 2. Hỗ trợ lập đề nghị (ưu tiên cao)
**Màn hình:** Lập đề nghị.

- Sinh khung gợi ý mục đích mua sắm từ mặt hàng, số lượng, đơn vị.
- Đề xuất phần thông số kỹ thuật cần làm rõ; mọi placeholder `[ ... ]` phải được người lập xác minh.
- Chỉ thay đổi trường mục đích sau khi người dùng nhấn nút “Dùng nội dung gợi ý”, không ghi ngầm vào hồ sơ; thông số chỉ là gợi ý văn bản.

## 3. Phân tích ngân sách (ưu tiên cao)
**Màn hình:** Quản lý ngân sách, dành cho vai trò có quyền ngân sách theo V9.

- Thống kê hạn mức điều chỉnh, đang giữ, đã cam kết, đã sử dụng, số còn khả dụng.
- Cảnh báo nguồn có số khả dụng dưới 15%; phát hiện đề nghị lớn so với trung vị của ít nhất 4 hồ sơ trong cùng nguồn.
- Phân tích thay đổi chi phí theo **3 tháng liên tiếp** từ bút toán `COMMIT_TO_USED`; nếu thiếu dữ liệu thì nói rõ chưa đủ căn cứ.
- Mọi lý do nêu ra chỉ là hướng kiểm tra, không tuyên bố nguyên nhân đã xác minh hay dự báo chắc chắn.

## 4. Hỗ trợ đánh giá hồ sơ duyệt (ưu tiên cao)
**Màn hình:** Chi tiết đề nghị, chỉ hiện khi người xem có quyền truy cập hàng chờ phê duyệt và không phải chính người tạo.

- Tóm tắt người lập, phòng ban, mục đích, số lượng hạng mục, tổng tiền có VAT, thời hạn, tài liệu và phiên bản.
- Nêu điểm cần kiểm tra: thông số trống, chứng từ chưa có, hồ sơ cùng nội dung, ngưỡng duyệt theo tiền; xem ngân sách sơ bộ **chỉ khi vai trò có quyền xem số dư**.
- Không tự quyết định phê duyệt, từ chối hay giữ ngân sách.

## File cần cập nhật trên GitHub
| Loại | Đường dẫn |
|---|---|
| MỚI | `src/ai/insights.ts` |
| MỚI | `src/components/ai/InsightCard.tsx` |
| SỬA | `src/views/CreateEditPRView.tsx` |
| SỬA | `src/views/PRDetailView.tsx` |
| SỬA | `src/views/BudgetManagementView.tsx` |
| SỬA | `package.json` (thêm script test:ai) |
| SỬA | `.gitignore` |
| MỚI | `tests/ai-assist.test.cjs` |

**Chú ý:** Không xóa các file khác trên repo. Đưa mỗi file vào **đúng đường dẫn**. Vercel sẽ build khi commit `main` nếu repo đang kết nối đúng.

## Kiểm thử
- `npm run test:ai`: compile logic riêng + 13 bài kiểm thử hỗ trợ thông minh.
- `npm run test:logic`: 40 bài kiểm thử nghiệp vụ/RBAC trước đây.
- `npm run build`: build Vite yêu cầu `npm install` và mạng tới npm registry.

Kiểm thử thực hiện trong môi trường hiện tại: 13/13 bài AI và 40/40 bài logic hiện hữu đạt, 5 file TS/TSX mới/chỉnh sửa transpile không có lỗi cú pháp.
**Chưa xác minh** build Vite đầy đủ hoặc thao tác end-to-end trên Vercel do npm không cài thư viện được trong môi trường này.

## Nếu sau này kết nối mô hình Gemini/OpenAI thật
1. Bổ sung **backend có xác thực** và kiểm soát vai trò/chi nhánh/phòng ban/hồ sơ ở máy chủ; không tin dữ liệu scope do frontend tự khai.
2. Chỉ gửi những trường tối thiểu và đã được người dùng cho phép; che dữ liệu nhạy cảm/đính kèm khi chưa có quyền; có giới hạn request, chi phí và audit.
3. Lưu khóa mô hình trong **biến môi trường server**, không dùng `VITE_*` cho API key và không nhúng bí mật trong bundle trình duyệt.
4. Thiết kế đầu ra có schema, thời hạn xử lý, cơ chế fallback, trích dẫn hồ sơ được cấp phép và đánh giá sai lệch/độ chính xác.
5. Giữ AI hoàn toàn ở vai trò hỗ trợ, không được ghi trạng thái duyệt hoặc ngân sách trực tiếp.
