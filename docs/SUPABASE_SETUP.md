# FridgeChef — chuyển sang Supabase

## Trạng thái

Mã nguồn đã dùng Supabase Auth và PostgreSQL làm nguồn dữ liệu chính. Giao diện Tủ lạnh/Đi chợ giữ nguyên. Việc cài SDK, cấu hình key và chạy SQL phải hoàn tất trước khi mở app. Chưa có đồng bộ offline hoặc Realtime; tải lại từ Tài khoản hoặc đưa ứng dụng từ nền trở lại để thấy thay đổi trên máy khác.

SQLite cũ không bị xóa. expo-sqlite vẫn dùng cho lưu phiên đăng nhập và nhập dữ liệu cũ. Đây không phải cơ chế đồng bộ hai chiều.

## 1. Tạo bảng và phân quyền

Trong project Supabase FridgeChef, chọn **SQL Editor → New query**. Mở file `supabase/migrations/202611130001_fridgechef.sql`, sao chép toàn bộ vào editor và chọn Run. Chạy một lần trên project mới; toàn bộ migration nằm trong một transaction. Nếu gặp lỗi, dừng và kiểm tra thay vì tắt RLS.

Kết quả: `storage_areas`, `food_items`, `shopping_items`, `legacy_imports`; hai RPC chuyển món và nhập dữ liệu cũ. `auth.users` do Supabase quản lý. RLS chỉ cho người dùng đã đăng nhập đọc/ghi dữ liệu có user_id của chính họ. Các grant trong SQL cần thiết nếu đã bỏ chọn Automatically expose new tables.

## 2. Cấu hình ứng dụng

Tạo `.env` từ `.env.example`. Điền URL project và **Publishable key** lấy từ Project Settings → API Keys:

```env
EXPO_PUBLIC_SUPABASE_URL=https://myisxmhufyzhohykocnb.supabase.co
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Không sử dụng Database password, secret key hoặc service_role trong app. File `.env` đã được Git ignore. Publishable key không phải ranh giới bảo mật; RLS mới kiểm soát truy cập.

Trong Terminal tại thư mục dự án:

```powershell
npm install
npm run check:source
npm test
npx expo start --clear
```

`npm install` cài SDK và cập nhật package-lock.json. Sau đó commit cả package.json và package-lock.json. Không chạy npm ci trước lần cập nhật lockfile này. SDK được ghim 2.49.9, có bản sửa import WebSocket cho React Native so với 2.49.8.

## 3. Đăng ký và đăng nhập

Authentication → Sign In / Providers: bảo đảm Email được bật. Giữ xác nhận email; đăng ký bằng email thật, mở thư xác nhận rồi quay lại ứng dụng đăng nhập. Kiểm tra Spam. Có thể tạo tài khoản demo đã xác nhận trong Authentication → Users → Add user nếu email xác nhận bị giới hạn; không dùng mật khẩu database làm mật khẩu demo.

Luồng hiện hỗ trợ email/mật khẩu, tên hiển thị, xác nhận mật khẩu, đăng xuất và khôi phục phiên. Google OAuth, đặt lại mật khẩu bằng deep link và chia sẻ tủ lạnh chưa triển khai. Nút demo Google trước đây đã được bỏ để không giả lập đăng nhập.

## 4. Nhập dữ liệu SQLite cũ

Đăng nhập đúng tài khoản muốn sở hữu dữ liệu → Tài khoản → Nhập dữ liệu từ thiết bị → xác nhận email và số món. Chỉ nhập tối đa 1.000 món cho nguồn hiện tại. Nguồn được gắn với tài khoản đã chọn, tránh nhập nhầm sang tài khoản khác trên cùng thiết bị.

RPC chạy nguyên tử và ghi sổ nhập để lần bấm lại không tạo trùng, kể cả khi phản hồi mạng bị mất. Bản SQLite vẫn còn để dự phòng. Sau khi đã nhập, xóa món trên cloud rồi bấm nhập lại không làm món sống lại. Thời điểm tạo/cập nhật trên cloud là lúc nhập; ngày mua, hạn dùng, số lượng, ngăn, nhóm, ghi chú và trạng thái đã mua được giữ.

## 5. Kiểm tra nghiệm thu

1. Đăng ký tài khoản A, xác nhận email, đăng nhập. Thêm thực phẩm rồi sửa/xóa, kiểm tra Table Editor có đúng user_id.
2. Thêm hai món đi chợ, đánh dấu đã mua, chọn số lượng/ngăn/hạn dùng khác nhau và cất. Hai món biến mất khỏi đi chợ và xuất hiện đúng trong tủ lạnh.
3. Đóng/mở app: phiên được khôi phục và dữ liệu tải từ Supabase.
4. Điện thoại khác đăng nhập A, chọn Tài khoản → Tải lại dữ liệu: thấy cùng dữ liệu.
5. Đăng xuất và đăng nhập tài khoản B: không thấy dữ liệu A; quay lại A thấy dữ liệu của A.
6. Ngắt mạng: lưu phải báo lỗi, không tự chuyển sang SQLite hoặc báo thành công giả. Nếu mất phản hồi sau khi bấm lưu, kiểm tra/tải lại trước khi nhập lại để tránh bản ghi trùng.
7. Tài khoản → Nhập dữ liệu cũ hai lần: không tạo trùng. Bản SQLite vẫn còn.

Kiểm thử SQL về RLS, transaction và nhập lặp nằm trong `supabase/tests/security.sql`. Chạy riêng trong SQL Editor sau migration; toàn bộ fixture được rollback.

## ERD mới

- `auth.users` 1–N `food_items` qua user_id.
- `auth.users` 1–N `shopping_items` qua user_id.
- `storage_areas` 1–N `food_items` qua storageAreaId.
- `legacy_imports` lưu từng nguồn nhập theo tài khoản; không phải danh sách thực phẩm.
- ID thực phẩm/đi chợ chuyển từ INTEGER cục bộ sang UUID trên cloud.

## Phạm vi kiểm chứng

Các unit test mới kiểm tra hợp đồng repository, account filter, UUID, payload RPC, phân trang và lỗi đăng nhập bằng client giả lập. 25 test SQLite/model cũ vẫn được giữ để bảo vệ dữ liệu nguồn. Chúng **không chứng minh RLS PostgreSQL hoặc đăng nhập thật đã chạy**. Phải chạy SQL test và kịch bản hai thiết bị trên project đã cấu hình trước khi tuyên bố hoàn thành triển khai.

## Tài liệu chính thức

- https://supabase.com/docs/guides/auth/quickstarts/react-native
- https://supabase.com/docs/guides/database/postgres/row-level-security
- https://supabase.com/docs/guides/getting-started/api-keys
- https://github.com/supabase/supabase-js/releases/tag/v2.49.9
