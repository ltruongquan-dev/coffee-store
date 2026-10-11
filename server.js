require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const authRoutes = require('./routes/auth.routes');
const menuRoutes = require('./routes/menu.routes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/cf_store';

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Connect to MongoDB
let isMongoConnected = false;

mongoose.connect(MONGODB_URI, {
  serverSelectionTimeoutMS: 5000
})
.then(async () => {
  isMongoConnected = true;
  console.log('✅ Đã kết nối thành công tới MongoDB cơ sở dữ liệu: cf_store');
  // Khởi tạo tài khoản admin mặc định nếu chưa tồn tại trong DB
  try {
    const User = require('./models/User');
    const bcrypt = require('bcryptjs');
    const adminExists = await User.findOne({ $or: [{ role: 'admin' }, { phone: '0909000000' }] });
    if (!adminExists) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      await User.create({
        phone: '0909000000',
        name: 'Chủ Quán (Admin Cáo Ngọt)',
        password: hashedPassword,
        role: 'admin'
      });
      console.log('👑 Đã tạo tài khoản Admin mặc định trong DB: SĐT 0909000000 / MK admin123');
    }
  } catch (seedErr) {
    console.error('Lỗi seed admin:', seedErr.message);
  }
})
.catch((err) => {
  isMongoConnected = false;
  console.error('❌ Không thể kết nối tới MongoDB:', err.message);
  console.log('👉 Vui lòng đảm bảo MongoDB Server đang chạy trên cổng 27017');
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/menu', menuRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    mongoConnected: mongoose.connection.readyState === 1
  });
});

// Redirect root to home page
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'home', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`\n=================================================`);
  console.log(`🦊 CÁO NGỌT Web App Server đang chạy tại:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`👉 Trang chủ:    http://localhost:${PORT}/home/`);
  console.log(`👉 Cà phê:      http://localhost:${PORT}/coffee/`);
  console.log(`👉 Thực đơn:    http://localhost:${PORT}/menu/`);
  console.log(`👉 Về chúng tôi: http://localhost:${PORT}/about/`);
  console.log(`👉 Liên hệ:     http://localhost:${PORT}/contact/`);
  console.log(`👉 Giỏ hàng:    http://localhost:${PORT}/cart/`);
  console.log(`👉 Đăng ký:     http://localhost:${PORT}/register/`);
  console.log(`👉 Đăng nhập:   http://localhost:${PORT}/login/`);
  console.log(`=================================================\n`);
});
