# FridgeChef 1.2 — triển khai và nghiệm thu

## Thay đổi theo yêu cầu

Dữ liệu ứng dụng được lấy từ Supabase. Đã bỏ đọc cache nghiệp vụ trên thiết bị, danh sách công thức mẫu trong ứng dụng, nút dữ liệu demo ở tủ lạnh và các mục nhập/xuất/sao lưu khỏi tài khoản.

Màn tài khoản quản lý hồ sơ, avatar, mật khẩu, email và phiên đăng nhập. Nhắc hạn dùng đặt tại màn cảnh báo, cài đặt được lưu ở Supabase theo tài khoản.

SDK Auth lưu token phiên theo cơ chế SDK để giữ đăng nhập. Ảnh được chọn có thể có file tạm do hệ điều hành/Expo tạo khi xử lý; bản ảnh chính là Supabase Storage. Không có mật khẩu hoặc kho thực phẩm được lưu cục bộ làm nguồn dữ liệu ứng dụng.

## Cơ sở dữ liệu

Chạy migration theo thứ tự chưa áp dụng trong Supabase SQL Editor:

1. `202611130001_fridgechef.sql`
2. `202611160001_complete_workflows.sql`
3. `202611170001_cloud_profiles_recipes.sql`

Nếu hai migration trước đã chạy, chỉ chạy file ngày 17/11. Không chạy lại file cũ lên schema đã tồn tại. Mỗi migration nằm trong một transaction; không tắt RLS khi gặp lỗi.

Migration mới thêm:

| Nơi lưu              | Dữ liệu                                                                    |
| -------------------- | -------------------------------------------------------------------------- |
| `profiles`           | Tên, điện thoại, ngày sinh, giới thiệu, đường dẫn avatar, cài đặt nhắc     |
| Storage `avatars`    | JPEG tối đa 1 MB trong thư mục UUID của chủ tài khoản; bucket riêng tư     |
| `recipe_catalog`     | Công thức chuẩn hóa, dữ liệu TheMealDB gốc, ID, URL và thời điểm lấy nguồn |
| `recipe_suggestions` | Bản dịch và giải thích Gemini riêng cho tài khoản                          |
| `recipe_favorites`   | Danh sách món yêu thích riêng cho tài khoản                                |

Hồ sơ được tạo khi đăng ký và backfill cho tài khoản cũ. Avatar truy cập bằng signed URL có thời hạn. Client chỉ đọc danh mục và gợi ý; Edge Function ghi hai bảng này bằng service role phía server. Món yêu thích, hồ sơ và thư mục avatar có RLS theo chủ sở hữu.

## Gemini và TheMealDB

Tạo `supabase/functions/.env.server` từ `.env.example` cùng thư mục, rồi tự điền:

```env
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.1-flash-lite
THEMEALDB_API_KEY=1
```

`gemini-3.1-flash-lite` là mặc định nhẹ cho lựa chọn/dịch; model có thể đổi bằng biến server. Bản 2.5 hiện bị giới hạn truy cập với người dùng mới theo tài liệu Google, nên không đặt làm mặc định cho dự án mới.

Key TheMealDB `1` dành cho phát triển/học tập. Trước khi đưa lên app store cần dùng key supporter theo điều kiện của TheMealDB. Nguồn là dữ liệu cộng đồng, không phải cơ sở dữ liệu được kiểm định y khoa hoặc chuyên gia dinh dưỡng. Giữ liên kết TheMealDB và liên kết tác giả gốc khi có; không lấy dữ liệu bằng cách scrape giao diện website.

```powershell
npx supabase login
npx supabase secrets set --env-file supabase/functions/.env.server --project-ref myisxmhufyzhohykocnb
npx supabase functions deploy ai-chef --project-ref myisxmhufyzhohykocnb
```

`SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` là biến của runtime Supabase Edge Functions. Không đưa service role hoặc Gemini key vào `.env` dành cho Expo, và không dùng tiền tố `EXPO_PUBLIC_` cho chúng.

Config gateway `verify_jwt=false` đi cùng kiểm tra bắt buộc `auth.getUser()` bên trong function. Mọi dữ liệu người dùng được truy vấn theo user ID lấy từ token, không lấy user ID do client truyền. Giới hạn số công thức và timeout vẫn áp dụng. Khi Gemini trả lỗi máy chủ tạm thời trong luồng gợi ý, Edge Function có thể thử lại một lần với model dự phòng.

### Cơ chế gợi ý

1. Khám phá món: gọi `search.php` chính thức của TheMealDB, tối đa 20 kết quả/lượt, ghi dữ liệu vào Supabase.
2. Gợi ý: đọc danh mục Supabase và tối đa 100 thực phẩm còn hạn. Nếu danh mục trống, nạp một nhóm món từ API nguồn trước.
3. Gemini chỉ chọn tối đa ba ID đã cung cấp, giải thích và dịch từng nguyên liệu/bước theo đúng số mục.
4. Server kiểm tra ID và số mục, ghép bản dịch với định lượng/provenance gốc, rồi ghi gợi ý vào Supabase.
5. App tải lại từ Supabase; yêu thích ghi vào bảng riêng. Đổi máy cùng tài khoản vẫn truy cập được dữ liệu đã lưu.

Không tự đổi “to taste”, “a pinch” hoặc số không có đơn vị thành gam/quả. Không tự đặt khẩu phần/thời gian khi nguồn thiếu. Khi cần mua nguyên liệu chưa có định lượng, người dùng mở form đi chợ để nhập. Khi hoàn thành món, người dùng xác nhận lượng thực tế trước khi trừ kho.

## Email, mật khẩu và avatar

Trong Supabase Auth, bật email, giữ xác nhận đổi email an toàn theo cấu hình dự án. Thêm Redirect URL `fridgechef://auth/callback`, cùng URL callback cụ thể của Expo Go khi phát triển. Không dùng wildcard rộng trong môi trường phát hành.

Đổi mật khẩu xác minh mật khẩu hiện tại trước. Nếu bật Secure Password Change và Supabase yêu cầu nonce, app có bước gửi/nhập mã qua email. Đổi email chưa thay đổi email đang hiển thị cho đến khi xác nhận thành công. Số điện thoại trong hồ sơ chỉ là liên hệ, không tự bật đăng nhập OTP.

Avatar chọn từ thư viện, crop vuông, giảm xuống rộng 512 pixel, chuyển JPEG và upload vào bucket riêng tư. Client cập nhật đường dẫn trong hồ sơ sau khi upload. File cũ được dọn khi đổi/gỡ ảnh; lỗi mạng không được coi là bằng chứng cập nhật thất bại để xóa nhầm file đang được dùng.

## Kiểm tra

```powershell
npm test
npm run check:source
npx expo export --platform android --output-dir .expo/review-build
```

Cần thử trên điện thoại:

- Hai tài khoản không đọc được hồ sơ, avatar, gợi ý và yêu thích của nhau.
- Sửa hồ sơ/đổi avatar trên máy A, đăng nhập máy B và kiểm tra dữ liệu.
- Đổi mật khẩu sai/đúng; thử nonce nếu dự án yêu cầu; đổi email và mở link xác nhận.
- Tài khoản không còn các nút nhập SQLite, xuất/chia sẻ dữ liệu hay sao lưu.
- Khám phá món, xem nguồn và tác giả gốc; yêu thích rồi mở lại trên máy khác.
- Gemini không có key, hết quota, API lỗi, không có món phù hợp: app báo trạng thái thật.
- Món thiếu thời gian/khẩu phần: không có số tự bịa. Món thiếu định lượng: không tự trừ kho.
- Mất mạng rồi khởi động lại: không đọc kho/công thức từ bản cache cũ.
- Từ chối quyền thư viện ảnh/thông báo: không báo thành công giả.

Bundle Android không phải APK. `eas.json` có profile `preview` để tạo APK sau khi đăng nhập/liên kết Expo; chưa tạo APK trong lượt sửa này.

## Phạm vi kiểm chứng

Đã kiểm tra parser bằng 20 công thức chicken từ API TheMealDB thật: cả 20 qua chuẩn hóa; 57 trường hợp định lượng không rõ được giữ nguyên, không đoán số. Kiểm thử tự động dùng PostgreSQL qua PGlite và native adapters giả lập. Chưa gọi Gemini thật khi chưa có key, chưa áp dụng migration/deploy lên Supabase hoặc kiểm chứng avatar/email trên thiết bị thật.

## Tài liệu nguồn

- https://www.themealdb.com/api.php
- https://www.themealdb.com/terms_of_use.php
- https://aistudio.google.com/docs/models/gemini-3.1-flash-lite
- https://ai.google.dev/gemini-api/docs/migrate-to-interactions
- https://supabase.com/docs/reference/javascript/auth-updateuser
