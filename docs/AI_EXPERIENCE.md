# Khám phá món ăn và Bếp AI

## Luồng sử dụng

- Tab **Món ăn**: tìm theo tên món tiếng Anh qua TheMealDB, lọc theo quốc gia, món yêu thích và các món AI đã chọn. Tìm kiếm không yêu cầu tồn kho.
- **Bếp AI**: hội thoại tiếng Việt có ngữ cảnh, tên hiển thị, gợi ý câu hỏi, chọn gửi tồn kho mới hoặc trò chuyện tự do. Lịch sử tối đa 50 trao đổi gần nhất được tải vào giao diện; Gemini nhận 8 trao đổi gần nhất.
- **Chọn món từ tủ lạnh**: yêu cầu số người và sở thích, Gemini chọn và dịch công thức có nguồn; không tự đoán định lượng còn thiếu.
- Chi tiết món: nguyên liệu, nguồn tham khảo, thêm phần còn thiếu vào đi chợ, xem từng bước, chế độ nấu và hỏi AI về món đang xem.
- Tin nhắn lỗi giữ mã yêu cầu để gửi lại; trao đổi đã lưu trả kết quả cũ mà không gọi Gemini lần nữa.
- Mỗi tài khoản dùng chung hạn mức 10 lượt khám phá/gợi ý/chat mỗi giờ.

## Lưu trữ và triển khai

Hồ sơ, công thức, món yêu thích và hội thoại đều lưu trên Supabase. Tin nhắn chỉ có thể đọc/xóa bởi chủ tài khoản; câu trả lời chỉ máy chủ được ghi. Không lưu hội thoại vào bộ nhớ bền vững của thiết bị.

Schema `supabase/schema/ai_conversations.sql` đã được áp dụng cho project hiện tại bằng migration hosted `ai_conversations`. Với project mới, áp dụng các migration cơ sở trước rồi schema này. Edge Function `ai-chef` cần cả `index.ts`, `_shared/mealdb.js` và `_shared/chat.js`, bật `verify_jwt=true`.

Secrets cần có: `GEMINI_API_KEY`, `THEMEALDB_API_KEY`. `GEMINI_MODEL` tùy chọn, mặc định `gemini-3.1-flash-lite`. Không đóng gói các secrets vào ứng dụng.

Khi tắt công tắc tồn kho, máy chủ không truy vấn/gửi tồn kho mới cho cuộc gọi chat đó. Các trao đổi cũ vẫn có thể nhắc lại nguyên liệu từng được chia sẻ; người dùng có thể xóa hội thoại để bỏ ngữ cảnh cũ.

## Kiểm tra

Chạy `npm test`, `npm run check:source` và `npx expo export --platform android`. Các bài kiểm tra mới bao gồm giới hạn dữ liệu gửi Gemini, thứ tự lịch sử, quota, lỗi lưu, retry cùng mã thao tác, tìm món không cần tồn kho và phân quyền hội thoại.

Đã thử trên Android giả lập bằng tài khoản đang đăng nhập: mở tab Món ăn, mở Bếp AI, gửi câu hỏi hướng dẫn pasta, nhận câu trả lời Gemini với tên hiển thị và định dạng hướng dẫn.
