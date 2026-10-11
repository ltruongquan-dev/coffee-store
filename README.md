# 🌿 CF STORE - HỆ THỐNG CỬA HÀNG CÀ PHÊ MỘC ĐẶC SẢN

Trang web giới thiệu quán cà phê, đặt món trực tuyến, quản lý thực đơn Client/Server Admin và quản lý thành viên với cơ sở dữ liệu **MongoDB** đồng bộ song song với file **`data/menu.json`**. 

Giao diện được thiết kế theo triết lý **Mobile-First**, tone màu **Trắng Xám & Xanh Lá Pastel**, typography chuẩn quốc tế:
- **Heading**: `Plus Jakarta Sans`
- **Body, Menu, Content**: `Inter`
- **Hover / Cursor**: Con trỏ chuột pointer trực quan trên tất cả các mục tương tác.

---

## 📁 Cấu Trúc Thư Mục (Folder Structure)

```
cf_store/
│
├── server.js                      # Server Express + Mongoose + API Auth & Menu
├── package.json                   # Dependencies & npm scripts
├── .env                           # Biến môi trường (PORT=5000, MONGODB_URI)
│
├── data/
│   └── menu.json                  # File JSON lưu trữ dữ liệu thực đơn chuẩn
│
├── models/                        # Mongoose Models (MongoDB Schema)
│   ├── User.js                    # Model User (phone, name, password hash, role)
│   ├── Otp.js                     # Model OTP xác thực SMS (SSM)
│   └── MenuItem.js                # Model Thực đơn (name, category, price, isBestseller, likes, createdBy, updatedBy, createdAt, updatedAt)
│
├── routes/                        # Backend REST APIs
│   ├── auth.routes.js             # API Gửi OTP SMS, Đăng ký, Đăng nhập MongoDB
│   └── menu.routes.js             # API Thực đơn, Admin thêm/sửa món, audit log, like
│
└── public/                        # Thư mục giao diện Web Frontend
    ├── index.html                 # Chuyển hướng tới trang chủ
    │
    ├── shared/                    # CSS & JS dùng chung cho toàn bộ website
    │   ├── common.css             # Theme Trắng Xám & Xanh Pastel, font Plus Jakarta & Inter
    │   ├── navbar.css             # Navbar không có trang chủ, logo về trang chủ
    │   ├── footer.css             # Footer với logo và thông tin liên lạc
    │   └── shared.js              # Xử lý drawer menu, giỏ hàng, popup SSM, like API
    │
    ├── home/                      # 🏠 Trang chủ (Click Logo để về đây)
    │   ├── index.html             # Hero background 100% width, 90vh & 5 khu vực chính
    │   ├── home.css
    │   └── home.js
    │
    ├── coffee/                    # ☕ Hạt Cà Phê (Thông tin hạt đặc sản)
    │   ├── index.html
    │   ├── coffee.css
    │   └── coffee.js
    │
    ├── menu/                      # 📋 Thực đơn (Cà phê, Espresso, Phindi, Trà sữa)
    │   ├── index.html             # Đánh dấu Like, Bestseller, hiển thị audit log DB
    │   ├── menu.css
    │   └── menu.js
    │
    ├── admin/                     # ⚙️ Quản trị Admin
    │   ├── index.html             # Giao diện Admin thêm món, sửa Bestseller, xem ai sửa và khi nào
    │   ├── admin.css
    │   └── admin.js
    │
    ├── about/                     # 🌿 Về chúng tôi
    │   ├── index.html, about.css, about.js
    │
    ├── contact/                   # 📞 Liên hệ
    │   ├── index.html, contact.css, contact.js
    │
    ├── cart/                      # 🛍️ Giỏ hàng
    │   ├── index.html, cart.css, cart.js
    │
    ├── register/                  # ✍️ Đăng ký tài khoản (Lưu trên MongoDB)
    │   ├── index.html, register.css, register.js
    │
    ├── login/                     # 🔑 Đăng nhập
    │   ├── index.html, login.css, login.js
    │
    └── assets/images/             # Hình ảnh chất lượng cao
        ├── barista_station.jpg    # Quầy pha chế
        ├── cafe_ambiance.jpg      # Không gian quán
        ├── drink_specialty.jpg    # Nước uống đặc trưng
        ├── artisan_pastries.jpg   # Món ăn & bánh ngọt
        └── coffee_beans_roast.jpg # Hạt cà phê mộc
```

---

## 🌟 Chi Tiết Các Cải Tiến Mới

### 1. Thanh Navigation Bar (Mobile-First)
- **Không có mục "Trang chủ" trên menu**: Trang chủ là trang mặc định đầu tiên khi vào web, và người dùng bấm vào **Logo CF Store** để quay về trang chủ.
- **Thứ tự các mục trên Navbar**:
  1. **Logo CF Store** (Click về trang chủ)
  2. **Hạt Cà Phê** (`/coffee/`)
  3. **Thực Đơn** (`/menu/`)
  4. **Về Chúng Tôi** (`/about/`)
  5. **Liên Hệ** (`/contact/`)
  6. **Giỏ Hàng** (`/cart/` - Icon Cart kèm badge số lượng)
  7. **Tài Khoản Khách Hàng** (Icon User kèm dropdown)

### 2. Background Trang Chủ
- Chiếm **100% width** và **90vh** (`height: 90vh`).
- Thiết kế phủ màu xanh lá pastel mộc mạc và nghệ thuật, hiệu ứng ánh sáng tự nhiên.

### 3. File JSON Lưu Thông Tin Thực Đơn (`data/menu.json`)
- File [data/menu.json](file:///d:/Web%20dev/cf_store/data/menu.json) lưu toàn bộ dữ liệu món ăn thức uống gồm 4 danh mục:
  - ☕ **Cà phê**
  - ⚡ **Espresso**
  - 🥜 **Phindi**
  - 🧋 **Trà sữa**
- Mỗi món chứa đầy đủ thuộc tính: `id`, `name`, `category`, `price`, `description`, `image`, `isBestseller`, `likes`, `createdBy`, `updatedBy`, `createdAt`, `updatedAt`.
- Tự động đồng bộ hai chiều với cơ sở dữ liệu **MongoDB**.

### 4. Hệ Thống Client / Server Admin Thêm Món & Audit Log
- **Trang Admin Dashboard**: [http://localhost:5000/admin/](http://localhost:5000/admin/)
- Admin có thể:
  - **Thêm món mới** vào thực đơn.
  - Chọn danh mục chuẩn: *Cà phê, Espresso, Phindi, Trà sữa*.
  - Đặt giá tiền, mô tả và đánh dấu món **Bestseller** (bestsaler).
  - Tự động ghi nhận:
    - **`createdBy` / `updatedBy`**: Tên người quản trị thực hiện thay đổi.
    - **`createdAt` / `updatedAt`**: Thời gian thực tế thay đổi được lưu vào MongoDB & `menu.json`.
  - Bật / tắt cờ **Bestseller** chỉ với 1 click.
  - Xóa món khỏi hệ thống.

### 5. Tính Năng Đánh Dấu Like & Bestseller
- Người dùng có thể bấm nút **💚 Like** trên từng món ăn ở cả Trang chủ và Thực đơn.
- Lượt like được cập nhật tức thì và lưu vào cơ sở dữ liệu MongoDB và `menu.json`.
- Huy hiệu **🔥 Bestseller** hiển thị nổi bật trên các món bán chạy nhất.

---

## 🚀 Cách Chạy Ứng Dụng

Khởi động server:
```bash
npm start
# hoặc
node server.js
```

Truy cập:
- **Trang chủ**: [http://localhost:5000/home/](http://localhost:5000/home/)
- **Thực đơn**: [http://localhost:5000/menu/](http://localhost:5000/menu/)
- **Quản trị Admin**: [http://localhost:5000/admin/](http://localhost:5000/admin/)
- **Hạt cà phê**: [http://localhost:5000/coffee/](http://localhost:5000/coffee/)
- **Về chúng tôi**: [http://localhost:5000/about/](http://localhost:5000/about/)
- **Liên hệ**: [http://localhost:5000/contact/](http://localhost:5000/contact/)
- **Giỏ hàng**: [http://localhost:5000/cart/](http://localhost:5000/cart/)
- **Đăng ký**: [http://localhost:5000/register/](http://localhost:5000/register/)
- **Đăng nhập**: [http://localhost:5000/login/](http://localhost:5000/login/)
