# Cấu hình Supabase

Hướng dẫn hiện hành: [FridgeChef 1.2 — Supabase, Gemini, nguồn công thức và tài khoản](RELEASE_1_2.md).

Project mới chạy ba migration ngày 13/11, 16/11 và 17/11 theo thứ tự. Project đã có hai migration đầu chỉ chạy thêm `202611170001_cloud_profiles_recipes.sql`.

Publishable key đặt trong `.env` của Expo. Gemini key và TheMealDB key đặt trong Supabase Secrets. Không đưa service role vào ứng dụng và không tắt RLS.
