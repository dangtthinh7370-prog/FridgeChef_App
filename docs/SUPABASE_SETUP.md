# Cấu hình Supabase

Hướng dẫn hiện hành: [FridgeChef 1.2 — Supabase, Gemini, nguồn công thức và tài khoản](RELEASE_1_2.md).

Project mới chạy ba migration ngày 13/11, 16/11 và 17/11 theo thứ tự. Project đã có hai migration đầu chỉ chạy thêm `202611170001_cloud_profiles_recipes.sql`.

Publishable key đặt trong `.env` của Expo. Gemini key và TheMealDB key đặt trong Supabase Secrets. Không đưa service role vào ứng dụng và không tắt RLS.

## Đăng nhập Google trên Android và iOS

1. Trong Google Auth Platform, tạo OAuth Client loại **Web application**. Thêm callback Supabase vào **Authorized redirect URIs**. Với dự án FridgeChef hiện tại, dùng https://myisxmhufyzhohykocnb.supabase.co/auth/v1/callback. Nếu ứng dụng Google đang ở chế độ Testing, thêm tài khoản dùng thử trong **Audience**.
2. Trong Supabase **Authentication → Sign In / Providers → Google**, bật Google và lưu Client ID cùng Client Secret của Web application. Giữ Client Secret trong Supabase.
3. Trong Supabase **Authentication → URL Configuration → Redirect URLs**, thêm đúng URI **fridgechef://google-auth**. Giữ các URL xác nhận email và khôi phục mật khẩu đã cấu hình.
4. Dùng bản Android cài riêng (ví dụ profile **preview** trong eas.json) để thử nút **Tiếp tục bằng Google**. Khi đóng gói, cấu hình biến Expo công khai cho URL và publishable key của đúng dự án. Bản cài riêng đăng ký scheme **fridgechef**, dùng để quay lại app từ trình duyệt.
