# Chạy FridgeChef bằng nút Run của Android Studio

Dự án có cấu hình chia sẻ tại `.run/FridgeChef_Android.run.xml`, dùng Shell Script plugin có sẵn trong Android Studio của máy hiện tại.

## Lần đầu

1. Cài thư viện nếu chưa có: `npm install` trong terminal dự án.
2. Mở máy ảo Android có Expo Go tương thích SDK 52 (máy Pixel_8 hiện tại đã có).
3. Nếu Expo cũ đang chạy trong Terminal, dừng bằng Ctrl+C.
4. Bấm danh sách **Add Configuration…** trên thanh trên cùng, chọn **FridgeChef Android**.
5. Bấm **Run ▶** hoặc Shift+F10. Kết quả hiện trong cửa sổ **Run** ở dưới.

Nếu cấu hình chưa hiện, dùng **File → Synchronize** (Ctrl+Alt+Y), hoặc mở lại dự án. Cấu hình nằm trong thư mục `.run` của project, không cần tạo project Android/Gradle khác.

## Các lần sau

Mở máy ảo, chọn FridgeChef Android và bấm Run. Dùng Stop ■ để dừng phiên đang chạy; sau đó Run lại để khởi động mới. Chỉ giữ một phiên Expo cho dự án để tránh trùng cổng 8081.

Chỉnh code được Expo tự tải lại. Cửa sổ Run không phải terminal tương tác đầy đủ; không cần gõ `a` hoặc `r` để mở app vì cấu hình đã chạy với `--android`.

Script dò Node.js, Expo CLI cục bộ và Android SDK. Nếu SDK nằm ở chỗ khác, đặt ANDROID_HOME theo Android SDK Location của Android Studio. Có thể kiểm tra trước mà không khởi động máy chủ:

```powershell
node scripts/run-android.cjs --check
```

CLI dùng `--offline` để chạy với Expo Go đã cài, tránh hộp hỏi nâng cấp/cài lại Expo Go trong cửa sổ Run. Cờ này không chặn kết nối mạng của ứng dụng, như các yêu cầu tới Supabase sau này. Khi cần cài Expo Go lần đầu hoặc nâng SDK, thực hiện riêng trong terminal tương tác.

## Thông số nếu cần tạo lại bằng tay

Trong Run → Edit Configurations → + → Shell Script:

| Trường | Giá trị |
|---|---|
| Name | FridgeChef Android |
| Script path | scripts/run-android.cmd trong thư mục dự án |
| Working directory | Thư mục dự án |
| Interpreter path | C:\Windows\System32\cmd.exe |
| Interpreter options | /d /c |
| Execute in terminal | Bỏ chọn |

Không dùng cấu hình Android App/Gradle cho bản Expo Go này.

Nếu máy ảo quá nhỏ, kéo vùng chia giữa Terminal/Run và phần trên xuống để dành thêm chỗ cho máy ảo; sau đó dùng điều khiển Zoom của cửa sổ máy ảo. Đây là thao tác hiển thị, không thay đổi dữ liệu ứng dụng.
