# FridgeChef 1.2 — Supabase, Gemini và công thức có nguồn

Ứng dụng React Native/Expo quản lý thực phẩm, hạn dùng, đi chợ và nấu ăn. **Dữ liệu nghiệp vụ lấy từ Supabase**: thực phẩm, đi chợ, hồ sơ, ảnh đại diện, cài đặt nhắc, danh mục công thức, gợi ý và món yêu thích.

## Luồng công thức

TheMealDB API chính thức → danh mục và dữ liệu nguồn trong Supabase → Gemini chọn món/dịch dựa trên nguyên liệu còn hạn → kết quả được ghi vào Supabase → ứng dụng đọc và hiển thị kèm liên kết nguồn.

Không dùng công thức mẫu trong ứng dụng. Gemini không được tạo ID món mới; các nguyên liệu và định lượng được giữ từ nguồn. Khi nguồn không ghi định lượng, thời gian hay khẩu phần, app đánh dấu chưa có và yêu cầu người dùng nhập nếu cần, thay vì tự đoán.

## Tài khoản

- Chỉnh tên, số điện thoại liên hệ, ngày sinh và giới thiệu.
- Chọn/gỡ avatar trong Supabase Storage riêng tư.
- Đổi mật khẩu có xác minh mật khẩu hiện tại; hỗ trợ mã xác thực khi Supabase yêu cầu.
- Đổi email qua liên kết xác nhận.
- Đăng xuất hiện tại hoặc mọi thiết bị.

Màn tài khoản không có nhập SQLite, sao lưu, xuất/chia sẻ dữ liệu hoặc quản lý lưu trữ.

## Chạy

```powershell
npm ci
npm test
npm run check:source
npx expo start --clear
```

Giữ Expo SDK 52, React Native 0.76.7, React 18.3.1. Cần hoàn tất migration và cấu hình Edge Function trước khi nghiệm thu chức năng mới.

Xem [hướng dẫn cấu hình 1.2](docs/RELEASE_1_2.md) cho migration, Gemini, TheMealDB, Storage và kịch bản thử thiết bị.

## Dữ liệu và kiểm thử

Ứng dụng không đọc cache thực phẩm/công thức hoặc dùng SQLite làm nguồn dự phòng. Dữ liệu đã tải chỉ tồn tại trong state của phiên chạy; mở lại cần kết nối Supabase. SDK Auth vẫn giữ token phiên trên thiết bị để duy trì đăng nhập, không lưu mật khẩu. Lịch thông báo và file ảnh tạm phục vụ hệ điều hành, không thay thế dữ liệu trên Supabase.

Các kiểm thử SQLite cũ là kiểm thử lịch sử; dependency graph của ứng dụng được kiểm tra để không gọi chúng. Bộ kiểm thử mới bao gồm RLS PostgreSQL, avatar, món yêu thích, xác thực tài khoản, Gemini chọn đúng nguồn và các luồng màn hình.

Tài liệu tuần 3 và bản 1.1 là lịch sử dự án; bản hiện hành là 1.2.
