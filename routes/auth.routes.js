const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');

const JWT_SECRET = process.env.JWT_SECRET || 'cf_store_super_secret_key_2026';

// Helper validate phone VN
function isValidVNPhone(phone) {
  return /^(0[3|5|7|8|9])[0-9]{8}$/.test(phone);
}

// 1. Kiểm tra SĐT & Gửi mã xác nhận SMS (SSM)
router.post('/send-sms-otp', async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp số điện thoại' });
    }

    const cleanPhone = phone.trim();
    if (!isValidVNPhone(cleanPhone)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Số điện thoại không hợp lệ (cần 10 số, bắt đầu bằng 03, 05, 07, 08, 09)' 
      });
    }

    // Kiểm tra xem số điện thoại đã đăng ký chưa
    const existingUser = await User.findOne({ phone: cleanPhone });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'Số điện thoại này đã được đăng ký tài khoản. Vui lòng đăng nhập!' 
      });
    }

    // Sinh mã OTP ngẫu nhiên 6 chữ số
    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Xoá các OTP cũ của SĐT này
    await Otp.deleteMany({ phone: cleanPhone });

    // Lưu mã OTP mới vào MongoDB
    await Otp.create({
      phone: cleanPhone,
      code: otpCode,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // hiệu lực 5 phút
    });

    console.log(`\n==============================================`);
    console.log(`📱 [DỊCH VỤ TIN NHẮN SMS - CF STORE]`);
    console.log(`Gửi tới số: ${cleanPhone}`);
    console.log(`Nội dung: [CF STORE] Ma xac thuc SSM cua ban la: ${otpCode}. Co hieu luc trong 5 phut.`);
    console.log(`==============================================\n`);

    return res.status(200).json({
      success: true,
      message: `Mã xác thực SMS đã được gửi tới số ${cleanPhone}`,
      // Gửi kèm otpCode để tiện test ngay trên giao diện & mô phỏng SMS Alert
      devOtp: otpCode
    });
  } catch (error) {
    console.error('Lỗi send-sms-otp:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi gửi mã xác thực' });
  }
});

// 2. Đăng ký tài khoản mới vào MongoDB (Không cần xác nhận SSM/OTP)
router.post('/register', async (req, res) => {
  try {
    const { phone, name, password, confirmPassword } = req.body;

    // Validation cơ bản
    if (!phone || !name || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'Vui lòng điền đầy đủ tất cả thông tin' });
    }

    const cleanPhone = phone.trim();
    const cleanName = name.trim();

    if (!isValidVNPhone(cleanPhone)) {
      return res.status(400).json({ success: false, message: 'Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08, 09)' });
    }

    if (cleanName.length < 2) {
      return res.status(400).json({ success: false, message: 'Họ tên phải có ít nhất 2 ký tự' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Mật khẩu phải từ 6 ký tự trở lên' });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Mật khẩu xác nhận không khớp' });
    }

    // Kiểm tra trùng SĐT trong User DB
    const existingUser = await User.findOne({ phone: cleanPhone });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Số điện thoại này đã được đăng ký tài khoản. Vui lòng đăng nhập!' });
    }

    // Mã hoá mật khẩu bằng bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Lưu user mới vào MongoDB
    const newUser = await User.create({
      phone: cleanPhone,
      name: cleanName,
      password: hashedPassword
    });

    // Tạo JWT token
    const token = jwt.sign(
      { id: newUser._id, phone: newUser.phone, name: newUser.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      success: true,
      message: 'Đăng ký tài khoản thành công! Dữ liệu đã lưu an toàn trên MongoDB.',
      token,
      user: {
        id: newUser._id,
        phone: newUser.phone,
        name: newUser.name,
        role: newUser.role
      }
    });
  } catch (error) {
    console.error('Lỗi register:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi đăng ký tài khoản' });
  }
});

// 3. Đăng nhập bằng Số điện thoại & Mật khẩu
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Vui lòng nhập số điện thoại và mật khẩu' });
    }

    const cleanPhone = phone.trim();

    // Tìm user theo số điện thoại trong MongoDB
    const user = await User.findOne({ phone: cleanPhone });
    if (!user) {
      return res.status(400).json({ success: false, message: 'Số điện thoại chưa được đăng ký hoặc không đúng' });
    }

    // So sánh mật khẩu
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: 'Mật khẩu không chính xác' });
    }

    // Tạo JWT token
    const token = jwt.sign(
      { id: user._id, phone: user.phone, name: user.name },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      success: true,
      message: 'Đăng nhập thành công!',
      token,
      user: {
        id: user._id,
        phone: user.phone,
        name: user.name,
        role: user.role
      }
    });

  } catch (error) {
    console.error('Lỗi đăng nhập:', error);
    return res.status(500).json({ success: false, message: 'Lỗi máy chủ khi đăng nhập' });
  }
});

// 4. Lấy thông tin user hiện tại (Token auth)
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Chưa đăng nhập' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'Người dùng không tồn tại' });
    }

    return res.status(200).json({ success: true, user });
  } catch (error) {
    return res.status(401).json({ success: false, message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn' });
  }
});

module.exports = router;
