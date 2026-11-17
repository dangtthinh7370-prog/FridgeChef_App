> Tài liệu lịch sử bản 1.1. Cấu hình hiện hành đã chuyển sang Supabase-only và Gemini, xem [RELEASE_1_2.md](RELEASE_1_2.md).

# FridgeChef 1.1 — triển khai và nghiệm thu

## Những gì đã triển khai trong mã nguồn

- Tủ lạnh: tất cả khu vực, tìm không dấu, lọc hạn dùng, kéo tải lại, dữ liệu thực.
- Trang chủ: số thực phẩm, cảnh báo cả quá hạn/sắp hết hạn, truy cập quét mã và gợi ý món.
- Đi chợ: CRUD, xác nhận từng món đã mua, chuyển vào tủ bằng transaction; công thức thêm phần thiếu sau khi trừ lượng đang có trong danh sách mua.
- Công thức: định lượng số, đổi g/kg và ml/l, điều chỉnh khẩu phần, ưu tiên lô gần hết hạn. Không tự quy đổi quả/hộp/bó sang khối lượng. Không lấy nguyên liệu quá hạn.
- AI Chef: gọi OpenAI từ Supabase Edge Function, xác thực tài khoản, đọc tồn kho của chính tài khoản, giới hạn 10 yêu cầu/tài khoản/giờ, giới hạn thời gian và kiểm tra phản hồi. Không đặt API key bí mật trong ứng dụng.
- Yêu thích: lưu công thức và danh sách yêu thích riêng theo tài khoản trên thiết bị, tối đa 100 công thức.
- Nấu: đúng bước của công thức đã chọn, đồng hồ dùng mốc thời gian để không trôi khi đưa app xuống nền, giữ màn hình sáng, hẹn thông báo nếu có quyền. Chuyển bước dừng đồng hồ cũ.
- Hoàn thành nấu: chọn và sửa lượng đã dùng trước khi trừ kho. Trừ nhiều lô trong một transaction; chống lặp yêu cầu và từ chối phiên bản tồn kho cũ.
- Ghi nhận dùng/bỏ đi, xem 100 hoạt động gần nhất. Xóa bản ghi là thao tác quản lý dữ liệu, không được tính là đã dùng hoặc bỏ đi.
- Camera quét EAN/UPC/Code128, tra tên với Open Food Facts, nhập mã hoặc tên thủ công khi không có kết quả. Hạn dùng vẫn nhập theo bao bì.
- Nhắc 07:00 và trước hạn một ngày, theo cài đặt của thiết bị. Nhắc bị hủy khi đăng xuất. Tối đa 30 ngày có cảnh báo cụ thể, cộng một lịch nhắc hằng ngày.
- Khôi phục mật khẩu qua email và deep link; chỉnh sửa tên tài khoản; chia sẻ bản dữ liệu hiện tại qua trình chia sẻ của điện thoại.
- Realtime, tải lại khi trở về ứng dụng và định kỳ một phút khi app đang hoạt động. Cache chỉ để đọc khi mất mạng, không xếp hàng ghi offline.
- Kiểm tra phiên bản khi sửa thực phẩm/món đi chợ để giảm ghi đè từ thiết bị khác.

## Trạng thái dịch vụ được kiểm tra ngày 16/11/2026

Project trong `.env` phản hồi Auth thành công, có bảng `food_items` với quyền đọc ẩn danh bị chặn. Bảng `food_activity` và function `ai-chef` chưa tồn tại tại thời điểm kiểm tra. Workspace không có khóa quản trị Supabase hoặc `OPENAI_API_KEY`; mã nguồn không tự thay đổi dịch vụ cloud.

## 1. Cập nhật cơ sở dữ liệu

Nếu project đã chạy migration ngày 13/11, chỉ chạy nội dung file sau trong Supabase SQL Editor:

`supabase/migrations/202611160001_complete_workflows.sql`

Với project mới: chạy migration `202611130001_fridgechef.sql`, sau đó migration mới. Mỗi file chạy một lần, nằm trong transaction. Không xóa bảng cũ, không tắt RLS. Nếu migration cũ được chạy thủ công, không dùng `db push` để chạy lại từ đầu khi chưa đồng bộ lịch sử migration.

Migration mới thêm nhật ký, sổ chống lặp, hạn mức AI, RPC trừ kho/thêm nguyên liệu thiếu và bật Realtime cho hai bảng hiện có. `SECURITY DEFINER` chỉ phục vụ ghi nhật ký và sổ chống lặp; RPC vẫn giới hạn mọi truy cập theo `auth.uid()`.

## 2. Triển khai AI

Cần Supabase CLI đã đăng nhập vào tài khoản có quyền project, cùng khóa OpenAI có hạn mức sử dụng. Không gửi khóa vào chat, không đặt trong `EXPO_PUBLIC_*`.

```powershell
Copy-Item supabase/functions/.env.example supabase/functions/.env.server
# Tự điền OPENAI_API_KEY trong file .env.server (đã được git ignore).
npx supabase login
npx supabase secrets set --env-file supabase/functions/.env.server --project-ref myisxmhufyzhohykocnb
npx supabase functions deploy ai-chef --project-ref myisxmhufyzhohykocnb
```

`verify_jwt = false` trong config chỉ bỏ kiểm tra JWT của gateway cũ. Function bắt buộc gọi `auth.getUser()` để xác thực token trước khi truy cập dữ liệu hoặc gọi OpenAI. Không chấp nhận `user_id` hay danh sách nguyên liệu do client tự gửi. Model mặc định `gpt-4o-mini`; có thể đổi biến server `OPENAI_MODEL` sang model hỗ trợ Chat Completions và JSON Schema.

Khi AI chưa triển khai hoặc hết hạn mức, app báo lỗi cụ thể và vẫn có công thức có sẵn. Không giả lập câu trả lời AI thành công.

## 3. Email và khôi phục mật khẩu

Trong Supabase Authentication → URL Configuration, thêm Redirect URL:

- `fridgechef://auth/callback` cho bản cài.
- URL callback của Expo Go trong mạng đang dùng, ví dụ `exp://192.168.1.10:8081/--/auth/callback` khi chạy phát triển. Thay IP bằng địa chỉ Expo thực tế, tránh wildcard rộng trong môi trường phát hành.

Giữ template xác nhận và recovery mặc định có `ConfirmationURL`. Mở email trên thiết bị đã cài app. Liên kết recovery sẽ mở màn đặt mật khẩu mới; liên kết hết hạn cần gửi lại.

## 4. Chạy và tạo bản Android

```powershell
npm ci
npm test
npm run check:source
npx expo start --clear
```

Giữ Expo SDK 52 và Expo Go tương thích khi thử dự án hiện có. Để kiểm tra đầy đủ scheme, quyền camera và thông báo của chính ứng dụng, dùng development build hoặc APK:

```powershell
npx expo run:android
```

Lệnh này cần Android SDK, máy ảo hoặc điện thoại đã kết nối và mạng tải dependency native. `expo export --platform android` kiểm tra bundle JS/Hermes, không tạo APK và không thay thế nghiệm thu thiết bị.

Có thể tạo APK qua EAS bằng `npx eas-cli build --platform android --profile preview` sau khi đăng nhập Expo và liên kết project. `eas.json` đã có profile APK nội bộ và AAB phát hành. Không có APK mới được tạo trong lượt này.

## 5. Kịch bản nghiệm thu trên điện thoại

1. Đăng ký/xác nhận email, đăng nhập, sửa tên; thử quên mật khẩu và liên kết hết hạn.
2. Thêm trứng, cà chua và thịt gà với hạn dùng thật. Sửa lượng, tìm không dấu, đổi khu vực và lọc hạn. Kiểm tra bàn phím, nút lưu và màn nhỏ.
3. Thêm một món quá hạn; xác nhận món đó xuất hiện ở cảnh báo nhưng không được tính vào nguyên liệu nấu. Chỉ ghi nhận bỏ đi cho món này.
4. Mở gợi ý món, tăng khẩu phần; kiểm tra quy đổi 0,5 kg thành 500 g và không đổi 1 hộp thành gam.
5. Thêm phần thiếu vào đi chợ, kiểm tra phần đã có trong danh sách được trừ. Đánh dấu đã mua rồi cất vào tủ với hạn riêng.
6. Gọi AI với yêu cầu cụ thể, thử tài khoản chưa đăng nhập, mất mạng, hết hạn mức và máy chủ chưa có khóa.
7. Nấu một món khác với món đầu danh sách; bước và đồng hồ phải đổi đúng công thức. Thử tạm dừng, đưa app xuống nền, chuyển bước và quay lại.
8. Hoàn thành món: sửa lượng dùng, bỏ chọn một nguyên liệu, xác nhận. Kiểm tra tồn kho và nhật ký; bấm nhanh/gửi lại không được trừ hai lần cùng thao tác.
9. Mở cùng tài khoản trên máy khác, sửa thực phẩm trong lúc máy đầu đang mở form cũ. Lưu form cũ phải báo xung đột.
10. Bật nhắc, cấp hoặc từ chối quyền; kiểm tra lịch hệ thống. Android/iOS có thể trì hoãn do tiết kiệm pin hoặc chế độ tập trung.
11. Quét mã có/không có trong Open Food Facts; từ chối camera; tra mã thủ công; tên được điền nhưng hạn dùng vẫn cần nhập.
12. Tắt mạng rồi mở lại: thấy cache của đúng tài khoản và trạng thái chỉ đọc. Bật mạng, kéo tải lại, đăng xuất và đăng nhập tài khoản khác để kiểm tra tách dữ liệu.

## Phạm vi còn cần kiểm chứng bên ngoài

- Đăng nhập, email, RLS và RPC trên project Supabase thật sau migration.
- Kết quả model AI với khóa có hạn mức và function đã deploy.
- Camera, thông báo nền, deep link và bố cục trên thiết bị thật.
- Tủ lạnh gia đình dùng chung, Google OAuth, OCR hóa đơn và ghi offline hai chiều chưa nằm trong bản này. Giao diện không hiển thị các nút giả cho các tính năng đó.

## Nguồn kỹ thuật

- https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail
- https://supabase.com/docs/guides/functions/auth
- https://developers.openai.com/api/reference/resources/chat
- API SDK cụ thể được kiểm tra trong các package Expo SDK 52 đã cài, do tài liệu v52 trên web hiện chuyển hướng sang bản mới.
