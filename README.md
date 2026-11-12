# 🥑 FridgeChef - Mobile App (Frontend)

Ứng dụng Di động Quản lý Thực phẩm, Cảnh báo Hạn sử dụng & Gợi ý Thực đơn Thông minh.

- **Môn học:** Lập trình Thiết bị Di động (Mobile Programming)
- **Giảng viên hướng dẫn:** TS. Lê Minh Trí
- **Nền tảng:** React Native (Expo)
- **Giai đoạn hoàn thành:** Tuần 2 — Thiết kế giao diện & Layout tĩnh 12 màn hình theo Figma.

---

## 🎨 Design System
- **Màu chủ đạo (Primary):** `#2E7D32` (Xanh lá)
- **Xanh đậm (Dark Green):** `#205C31` (Card AI Chef)
- **Nền app (Background):** `#F7FAF6`
- **Sắp hết hạn (Expiry Soon):** `#F4A62A` (Cam vàng)
- **Đã quá hạn (Expired):** `#CE4E46` (Đỏ)

---

## 📱 12 Màn hình đã dựng hoàn chỉnh
1. `01 - Đăng nhập` (`LoginScreen.js`)
2. `02 - Trang chủ` (`HomeScreen.js`)
3. `03 - Tủ lạnh ảo` (`FridgeScreen.js`)
4. `04 - Thêm thực phẩm` (`AddFoodScreen.js`)
5. `05 - Chi tiết thực phẩm` (`FoodDetailScreen.js`)
6. `06 - Quét mã vạch` (`BarcodeScreen.js`)
7. `07 - Cảnh báo hạn dùng` (`ExpiryAlertScreen.js`)
8. `08 - AI Chef` (`AIChefScreen.js`)
9. `09 - Chi tiết công thức` (`RecipeDetailScreen.js`)
10. `10 - Chế độ nấu ăn & Timer` (`CookingModeScreen.js`)
11. `11 - Danh sách đi chợ` (`ShoppingListScreen.js`)
12. `12 - Tài khoản & Cài đặt` (`ProfileScreen.js`)

---

## 🔑 Tài khoản Demo (Tuần 2)
Do ứng dụng đang ở giai đoạn UI tĩnh (Tuần 2), dữ liệu đăng nhập được cấu hình mẫu trong `src/data/mockData.js`:
- **Email:** `fridgechef@example.com`
- **Mật khẩu:** `123456`
- Bấm nút **Đăng nhập** sẽ tự động chuyển vào màn hình chính.
*(Tuần 3 & 4: Thành viên Backend sẽ tích hợp Firebase Authentication).*

---

## 🚀 Hướng dẫn chạy dự án cho các thành viên trong nhóm

### 1. Cài đặt môi trường
Đảm bảo máy đã cài **Node.js** (v18+ hoặc v20+).

### 2. Cài đặt các gói phụ thuộc (Dependencies)
Mở terminal tại thư mục dự án và chạy:
```bash
npm install
```

### 3. Khởi động ứng dụng
```bash
npx expo start
```

### 4. Xem trên điện thoại
- Cài app **Expo Go** trên điện thoại (từ Google Play hoặc App Store).
- Dùng camera (iOS) hoặc tính năng "Scan QR Code" trong Expo Go (Android) để quét mã QR hiển thị ở terminal.
- Đảm bảo điện thoại và máy tính cùng kết nối chung một mạng Wi-Fi.

---

## 👥 Phân công phối hợp nhóm
- **Frontend (Giao diện):** Đã hoàn thiện 100% layout tĩnh và Navigation trong `src/screens/` và `src/navigation/`.
- **Backend / Database (Tuần 3):** Tạo Firestore Collection và viết hàm gọi dữ liệu trong `src/services/`.
- **AI & API (Tuần 4):** Tích hợp Gemini API và OpenFoodFacts API.
