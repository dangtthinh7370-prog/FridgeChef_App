# 🥑 FridgeChef - Mobile App (Frontend)

Ứng dụng Di động Quản lý Thực phẩm, Cảnh báo Hạn sử dụng & Gợi ý Thực đơn Thông minh.
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
npx expo start // k được thì chạy npx expo start --tunnel
```

### 4. Xem trên điện thoại
- Cài app **Expo Go** (phiên bản 52) trên điện thoại (từ Google Play hoặc App Store hoặc Apk).
- Dùng camera (iOS) hoặc tính năng "Scan QR Code" trong Expo Go (Android) để quét mã QR hiển thị ở terminal.
- Đảm bảo điện thoại và máy tính cùng kết nối chung một mạng Wi-Fi.

---

## 👥 Phân công phối hợp nhóm
- **Frontend (Giao diện):** Đã hoàn thiện 100% layout tĩnh và Navigation trong `src/screens/` và `src/navigation/`.
- **Backend / Database (Tuần 3):** Tạo Firestore Collection và viết hàm gọi dữ liệu trong `src/services/`.
- **AI & API (Tuần 4):** Tích hợp Gemini API và OpenFoodFacts API.


# CẤU TRÚC THƯ MỤC DỰ ÁN
FridgeChef/
├── assets/                  # Ảnh logo FC, placeholder
├── src/
│   ├── constants/           # Bảng màu, typography từ Figma
│   │   └── theme.js
│   ├── components/          # Các thành phần giao diện tái sử dụng
│   │   ├── PrimaryButton.js # Nút bấm chuẩn 48px, bo góc 12px
│   │   ├── FreshnessBadge.js# Badge: Còn hạn / Sắp hết / Quá hạn
│   │   └── ScreenHeader.js  # Tiêu đề 24px Bold + phụ đề
│   ├── data/                # DỮ LIỆU MẪU (Mock data cho Tuần 2)
│   │   └── mockData.js      # Danh sách 18 thực phẩm, gợi ý món ăn...
│   ├── navigation/          # Cấu hình chuyển trang theo User Flow
│   │   ├── RootNavigator.js # Luồng chính: Login -> App
│   │   └── TabNavigator.js  # 4 tab: Trang chủ, Tủ lạnh, Đi chợ, Tài khoản
│   ├── screens/             # 12 màn hình theo Figma
│   │   ├── auth/            # 01 - Đăng nhập
│   │   ├── home/            # 02 - Trang chủ, 07 - Cảnh báo hạn dùng
│   │   ├── fridge/          # 03 - Tủ lạnh ảo, 04 - Thêm món, 05 - Chi tiết món, 06 - Quét mã
│   │   ├── recipe/          # 08 - AI Chef, 09 - Chi tiết công thức, 10 - Chế độ nấu
│   │   ├── shopping/        # 11 - Danh sách đi chợ
│   │   └── profile/         # 12 - Tài khoản
│   └── services/            # (Để trống cho thành viên Backend/AI ở Tuần 3-4)
├── App.js
├── README.md                # Hướng dẫn chạy dự án cho nhóm
└── .gitignore