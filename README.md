# FridgeChef — Supabase

**Mã nguồn hiện dùng Supabase Auth và PostgreSQL.** Cần hoàn tất cấu hình trước khi chạy:

1. Chạy `supabase/migrations/202611130001_fridgechef.sql` trong Supabase SQL Editor.
2. Tạo `.env` theo `.env.example`, điền Publishable key của project.
3. Chạy `npm install` để cài SDK và cập nhật package-lock.json, sau đó `npx expo start --clear`.
4. Đăng ký/xác nhận email và đăng nhập. Dữ liệu được tách theo tài khoản bằng RLS.

Hướng dẫn đầy đủ, nhập SQLite cũ, kiểm tra hai thiết bị và giới hạn hiện tại: [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).

- Giữ giao diện Tủ lạnh/Đi chợ; thêm đăng ký và đăng nhập thật.
- CRUD thực phẩm và đi chợ qua Supabase; chuyển món bằng PostgreSQL RPC transaction.
- Tài khoản → Tải lại dữ liệu để lấy thay đổi từ máy khác.
- Tài khoản → Nhập dữ liệu từ thiết bị để nhập SQLite cũ một lần, không xóa bản cũ.
- SQLite còn dùng để lưu phiên đăng nhập và đọc dữ liệu cũ, không đồng bộ offline hai chiều.
- Chưa có Google OAuth, đặt lại mật khẩu, Realtime hoặc chia sẻ tủ lạnh giữa tài khoản.

**Kiểm chứng:** `npm test` gồm unit test hợp đồng client Supabase và test SQLite/model cũ. Chạy thêm `supabase/tests/security.sql` và kiểm tra đăng nhập/hai thiết bị trên project thật. Unit test giả lập không xác nhận RLS trên server.

---

Phần dưới lưu lại mô tả bản SQLite tuần 3 trước khi chuyển Supabase; không phải cấu hình lưu trữ đang được ứng dụng sử dụng.

# FridgeChef

Ứng dụng React Native + Expo quản lý thực phẩm, hạn dùng và danh sách đi chợ.

## Bản tuần 3 — lưu trữ SQLite trước khi chuyển cloud

**Lưu trữ: SQLite cục bộ. Kiến trúc: MVVM với custom hooks và Context.**

Màn thêm/sửa thực phẩm được thiết kế lại cho điện thoại theo yêu cầu: số lượng có nút −/+, chọn đơn vị riêng, chọn ngày bằng lịch, gợi ý tên nhanh, thông tin bổ sung có thể thu gọn, nút lưu cố định và “Lưu và thêm món khác”. Nhóm thực phẩm và ghi chú được lưu thật; hạn dùng mới để trống để chọn theo bao bì.

- Thêm, đọc, sửa, xóa thực phẩm; lưu dữ liệu qua các lần đóng/mở app.
- Lọc theo ngăn, tìm theo tên, xem chi tiết.
- Trang chủ và cảnh báo dùng dữ liệu thực từ cùng cơ sở dữ liệu.
- Tự tính trạng thái hạn dùng theo ngày hiện tại.
- CRUD danh sách đi chợ, tách Cần mua/Đã mua, chọn đơn vị nhanh, lưu liên tiếp.
- Khi cất vào tủ lạnh, nhập số lượng thực mua, ngăn và hạn dùng riêng cho từng món; có thể chuyển riêng một món đã mua.
- Chuyển món đã mua vào tủ lạnh trong một transaction.
- Kiểm tra dữ liệu, trạng thái bận, lỗi và danh sách trống.
- Nhóm thực phẩm và ghi chú tùy chọn (schema v2, tự nâng cấp DB v1 mà không xóa dữ liệu).
- Có dữ liệu mẫu tùy chọn bằng nút bấm; không tự đổ lại khi mở app.

Xem [kế hoạch, ERD, từ điển dữ liệu, kiến trúc và kịch bản demo tuần 3](docs/WEEK3.md).

## Chạy trên Android Emulator

Máy cần Node.js và Android Studio với máy ảo đã khởi động.

```powershell
cd D:\2026-2027\FridgeChef
npm install
npx expo start --clear
```

Nhấn **a** trong terminal để mở trên Android. Giữ terminal mở.

Dự án dùng **Expo SDK 52**, React Native 0.76.7, React 18.3.1 và expo-sqlite ~15.1.4.
Dùng Expo Go tương thích SDK 52; nếu cần tải bản phù hợp tại [expo.dev/go](https://expo.dev/go).
Không nâng riêng Expo Go/SDK hoặc expo-sqlite mà chưa kiểm tra tương thích.

Giữ giao diện đăng nhập gốc của nhóm: bấm **Đăng nhập** để vào phiên demo. Chưa xác thực tài khoản trực tuyến; dữ liệu SQLite dùng chung trên thiết bị, không được tách theo email nhập vào.

Giữ các tab, trang chủ và phong cách màu xanh của nhóm. Riêng màn thêm/sửa thực phẩm được thiết kế lại; chi tiết hiển thị thêm nhóm và ghi chú khi có. Các thay đổi tuần 3 tập trung vào nối dữ liệu, kiểm tra nhập liệu và CRUD.

Lần đầu danh sách trống. Có thể tự nhập thực phẩm hoặc bấm **Thêm 4 thực phẩm mẫu để thử** trong tab Tủ lạnh.
Khi cập nhật từ bản tuần 2, dữ liệu mock cũ không tự chuyển thành dữ liệu đã lưu.

## Chạy bằng nút Run trong Android Studio

Chọn **FridgeChef Android** trên thanh cấu hình rồi bấm **Run ▶** (Shift+F10). Mở máy ảo trước và dừng Expo đang chạy trong Terminal để tránh trùng cổng. Xem [hướng dẫn cấu hình Run](docs/ANDROID_STUDIO_RUN.md).

## Kiểm thử

Bộ kiểm thử cần Node 22.13+; khuyên dùng Node 24.

```powershell
npm test
npm run check:source
```

Test chạy model/schema/repository thực trên SQLite của Node. Kiểm tra source không thay thế chạy thử giao diện và native module trên Android.

## Cấu trúc

| Thư mục | Vai trò |
|---|---|
| src/screens | View: các màn hình |
| src/components | Thành phần giao diện dùng lại |
| src/viewmodels | State và xử lý thao tác, chia sẻ dữ liệu |
| src/models | Quy tắc và kiểm tra dữ liệu |
| src/repositories | CRUD SQL, transaction |
| src/database | Schema, index, migration |
| src/navigation | Stack và bottom tabs |
| src/constants | Màu sắc và kích thước |
| src/data | Dữ liệu demo công thức của tuần 2 |
| tests | Kiểm thử model và SQLite |
| docs | Báo cáo tuần 3 |

## Cơ sở dữ liệu

File `fridgechef.db` chứa ba bảng:

- `storage_areas`: ngăn mát, ngăn đông, đồ khô.
- `food_items`: thực phẩm, số lượng, đơn vị, ngăn, ngày mua, hạn dùng.
- `shopping_items`: các món cần mua và trạng thái đã mua.

Một ngăn có nhiều thực phẩm. Không lưu mật khẩu, dữ liệu người dùng cloud hoặc trạng thái hết hạn cố định.
Các thao tác ghi dùng SQL có tham số; chuyển đi chợ → tủ lạnh dùng transaction.

## Phạm vi chưa triển khai

Firebase Authentication, Firestore, tủ lạnh dùng chung, đồng bộ nhiều máy, quét mã vạch, AI thật và thông báo nền chưa được triển khai.
AI Chef, công thức, chế độ nấu và màn hình mã vạch vẫn thuộc demo tuần 2; không được dùng làm bằng chứng chức năng backend.
Đích nghiệm thu tuần 3 là Android; chưa cấu hình SQLite trên web.

Kế hoạch ban đầu dùng Firebase được thay bằng SQLite cho tuần 3 để đáp ứng nhánh lưu trữ cục bộ của đề.
Nhóm có thể bổ sung Firebase trong giai đoạn tiếp theo qua lớp repository, cùng thiết kế tài khoản/phân quyền và di chuyển dữ liệu.

## Giao diện

Màu chính `#2E7D32`, xanh đậm `#205C31`, nền `#F7FAF6`, sắp hết hạn `#F4A62A`, quá hạn `#CE4E46`.
Các tham chiếu icon/splash/favicon đến thư mục assets chưa có đã được bỏ khỏi cấu hình; cần bổ sung ảnh trước khi phát hành.
