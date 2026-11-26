
const express = require('express');
const router = express.Router();

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');

const Order = require('../models/order');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');


const JWT_SECRET =
  process.env.JWT_SECRET || 'cf_store_super_secret_key_2026';

// ========================================
// 1. MIDDLEWARE XÁC THỰC NGƯỜI DÙNG
// ========================================

async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Vui lòng đăng nhập'
      });
    }

    const token = authHeader.split(' ')[1];

    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Tài khoản không tồn tại'
      });
    }

    req.user = user;

    next();

  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn'
    });
  }
}

// ========================================
// 2. MIDDLEWARE KIỂM TRA ADMIN
// ========================================

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({
      success: false,
      message: 'Bạn không có quyền thực hiện chức năng này'
    });
  }

  next();
}

// ========================================
// 2.1. KHÁCH HÀNG TẠO ĐƠN HÀNG
// POST /api/orders
// ========================================

router.post('/', authenticate, async (req, res) => {
  try {
  const {
  orderCode: requestedOrderCode,
  customer,
  deliveryType,
  paymentMethod,
  items
} = req.body;
    // Kiểm tra thông tin khách hàng
    if (
      !customer ||
      !customer.name ||
      !customer.phone
    ) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp thông tin người nhận'
      });
    }

    // Kiểm tra địa chỉ giao hàng
    if (
      deliveryType === 'delivery' &&
      !customer.address
    ) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng nhập địa chỉ giao hàng'
      });
    }

    // Kiểm tra sản phẩm
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Giỏ hàng không có sản phẩm'
      });
    }

    // Kiểm tra phương thức nhận hàng
    if (!['delivery', 'pickup'].includes(deliveryType)) {
      return res.status(400).json({
        success: false,
        message: 'Hình thức nhận hàng không hợp lệ'
      });
    }

    // Kiểm tra phương thức thanh toán
    const allowedPayments = [
      'vietqr',
      'momo',
      'zalopay',
      'card'
    ];

    if (!allowedPayments.includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: 'Phương thức thanh toán không hợp lệ'
      });
    }

    // Chuẩn hóa danh sách sản phẩm
    const orderItems = [];

    for (const item of items) {
      const productId = String(item.id || item.productId || '');
      const name = String(item.name || '').trim();
      const price = Number(item.price);
      const quantity = Number(item.quantity || 1);

      if (
        !name ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isInteger(quantity) ||
        quantity < 1
      ) {
        return res.status(400).json({
          success: false,
          message: 'Thông tin sản phẩm không hợp lệ'
        });
      }

      // Nếu có ID MongoDB, kiểm tra sản phẩm còn tồn tại
      let menuProduct = null;

      if (mongoose.Types.ObjectId.isValid(productId)) {
        menuProduct = await MenuItem.findById(productId);

        if (!menuProduct) {
          return res.status(400).json({
            success: false,
            message: `Không tìm thấy sản phẩm: ${name}`
          });
        }
      }

      orderItems.push({
        productId,
        name: name || menuProduct?.name,
        image: item.image || menuProduct?.image || '',
        price,
        quantity,
        size: item.size || '',
        toppings: item.toppings || '',
        note: item.note || ''
      });
    }

    // Tính tổng tiền hàng
    const subtotal = orderItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );

    // Tính phí giao hàng
    let shippingFee = 0;

    if (deliveryType === 'delivery' && subtotal < 200000 && subtotal > 0) {
      shippingFee = 25000;
    }

    const totalAmount = subtotal + shippingFee;

   const orderCode = requestedOrderCode
  ? String(requestedOrderCode).trim()
  : `CN${Date.now()}`;

// Kiểm tra mã đơn hàng đã tồn tại chưa
const existingOrder = await Order.findOne({ orderCode });

if (existingOrder) {
  return res.status(409).json({
    success: false,
    message: 'Mã đơn hàng đã tồn tại'
  });
}

    // Lưu đơn hàng vào MongoDB
    const order = await Order.create({
      orderCode,

      userId: req.user._id,

      customer: {
        name: customer.name.trim(),
        phone: customer.phone.trim(),
        address: customer.address || ''
      },

      deliveryType,

      items: orderItems,

      subtotal,
      shippingFee,
      totalAmount,

      paymentMethod,
      paymentStatus: 'paid',

// Tự động hoàn thành đơn hàng
      status: 'completed',
      orderStatus: 'completed',
      completedAt: new Date(),

      statusHistory: [{
        status: 'completed',
        note: 'Đơn hàng đã giao thành công',
        changedAt: new Date()
      }],

       pointsEarned: 0,
       pointsAwarded: false
    });

    // ========================================
// TỰ ĐỘNG CỘNG 5 ĐIỂM KHI ĐƠN HOÀN THÀNH
// ========================================

if (
  order.orderStatus === 'completed' &&
  !order.pointsAwarded
) {
  // Cộng đúng 5 điểm vào tài khoản khách hàng
  const updatedUser = await User.findByIdAndUpdate(
    order.userId,
    {
      $inc: {
        loyaltyPoints: 5
      }
    },
    { new: true }
  );

  if (!updatedUser) {
    throw new Error('Không tìm thấy tài khoản để cộng điểm');
  }

  // Đánh dấu đơn hàng đã được cộng điểm
  order.pointsEarned = 5;
  order.pointsAwarded = true;

  await order.save({ validateBeforeSave: false });
}

    return res.status(201).json({
      success: true,
      message: 'Tạo đơn hàng thành công',
      data: order
    });

  } catch (error) {
    console.error('Lỗi tạo đơn hàng:', error);

    return res.status(500).json({
      success: false,
      message: 'Không thể tạo đơn hàng'
    });
  }
});

// ========================================
// 3. KHÁCH HÀNG XEM LỊCH SỬ ĐƠN HÀNG
// GET /api/orders/my
// ========================================

router.get('/my', authenticate, async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(
      50,
      Math.max(1, parseInt(req.query.limit) || 10)
    );

    const filter = {
      userId: req.user._id
    };

    if (req.query.status) {
      filter.orderStatus = req.query.status;
    }

    const orders = await Order.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select('-__v');

    const total = await Order.countDocuments(filter);

    return res.status(200).json({
      success: true,
      message: 'Lấy lịch sử đơn hàng thành công',
      data: orders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Lỗi lấy lịch sử đơn hàng:', error);

    return res.status(500).json({
      success: false,
      message: 'Không thể lấy lịch sử đơn hàng'
    });
  }
});

// ========================================
// 4. XEM CHI TIẾT ĐƠN HÀNG
// GET /api/orders/:id
// ========================================

router.get('/:id', authenticate, async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'ID đơn hàng không hợp lệ'
      });
    }

    const order = await Order.findById(id).select('-__v');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy đơn hàng'
      });
    }

    // Khách chỉ được xem đơn của mình.
    // Admin được xem tất cả đơn.
    if (
      req.user.role !== 'admin' &&
      order.userId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Bạn không có quyền xem đơn hàng này'
      });
    }

    return res.status(200).json({
      success: true,
      data: order
    });

  } catch (error) {
    console.error('Lỗi xem chi tiết đơn:', error);

    return res.status(500).json({
      success: false,
      message: 'Không thể xem chi tiết đơn hàng'
    });
  }
});

// ========================================
// 5. ADMIN XEM TẤT CẢ ĐƠN HÀNG
// GET /api/orders/admin/all
// ========================================

router.get(
  '/admin/all',
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(
        50,
        Math.max(1, parseInt(req.query.limit) || 10)
      );

      const filter = {};

      if (req.query.status) {
        filter.orderStatus = req.query.status;
      }

      const orders = await Order.find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .select('-__v');

      const total = await Order.countDocuments(filter);

      return res.status(200).json({
        success: true,
        message: 'Lấy danh sách đơn hàng thành công',
        data: orders,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit)
        }
      });

    } catch (error) {
      console.error('Lỗi Admin lấy đơn hàng:', error);

      return res.status(500).json({
        success: false,
        message: 'Không thể lấy danh sách đơn hàng'
      });
    }
  }
);

// ========================================
// 6. ADMIN CẬP NHẬT TRẠNG THÁI ĐƠN
// PATCH /api/orders/:id/status
// ========================================

router.patch(
  '/:id/status',
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { status, note } = req.body;

      const allowedStatuses = [
        'pending',
        'confirmed',
        'preparing',
        'delivering',
        'completed',
        'cancelled'
      ];

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID đơn hàng không hợp lệ'
        });
      }

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          message: 'Trạng thái đơn hàng không hợp lệ'
        });
      }

      const order = await Order.findById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng'
        });
      }

      if (
        order.orderStatus === 'completed' ||
        order.orderStatus === 'cancelled'
      ) {
        return res.status(400).json({
          success: false,
          message: 'Đơn hàng đã kết thúc, không thể đổi trạng thái'
        });
      }

      // Không cho hoàn thành nếu chưa thanh toán
      if (
        status === 'completed' &&
        order.paymentStatus !== 'paid'
      ) {
        return res.status(400).json({
          success: false,
          message: 'Đơn hàng chưa thanh toán thành công'
        });
      }

      order.orderStatus = status;
      order.status = status;

      order.statusHistory.push({
        status,
        note: typeof note === 'string' ? note.trim() : '',
        changedAt: new Date()
      });

      if (status === 'completed') {
        order.completedAt = new Date();
      }

      await order.save({ validateBeforeSave: false });

// ========================================
// CỘNG ĐIỂM THÀNH VIÊN KHI ĐƠN HOÀN THÀNH
// ========================================

if (
  status === 'completed' &&
  order.paymentStatus === 'paid' &&
  !order.pointsAwarded &&
  order.userId
) {

  const pointsToAward = 5;

  // Đánh dấu đơn đã được xử lý điểm một cách nguyên tử,
  // tránh cộng điểm hai lần khi có request đồng thời.
  const claimedOrder = await Order.findOneAndUpdate(
    {
      _id: order._id,
      pointsAwarded: false
    },
    {
      $set: {
        pointsAwarded: true,
        pointsEarned: pointsToAward
      }
    },
    {
      new: true
    }
  );

  // Chỉ cộng điểm nếu lần này giành được quyền xử lý
  if (claimedOrder) {

    const updatedUser = await User.findByIdAndUpdate(
      order.userId,
      {
        $inc: {
          loyaltyPoints: pointsToAward
        }
      },
      {
        new: true
      }
    );

    if (!updatedUser) {

      // Hoàn lại trạng thái nếu không tìm thấy tài khoản
      await Order.findByIdAndUpdate(order._id, {
        $set: {
          pointsAwarded: false,
          pointsEarned: 0
        }
      });

      return res.status(404).json({
        success: false,
        message: 'Không tìm thấy tài khoản để cộng điểm'
      });
    }

    // Cập nhật dữ liệu trả về Postman
    order.pointsAwarded = true;
    order.pointsEarned = pointsToAward;
  }
}

return res.status(200).json({
  success: true,
  message: 'Cập nhật trạng thái đơn hàng thành công',
  data: order
});

    } catch (error) {
      console.error('Lỗi cập nhật trạng thái:', error);

      return res.status(500).json({
        success: false,
        message: 'Không thể cập nhật trạng thái đơn hàng'
      });
    }
  }
);

// ========================================
// 7. ADMIN MÔ PHỎNG XÁC NHẬN THANH TOÁN
// PATCH /api/orders/:id/payment/simulate-success
// CHỈ DÙNG ĐỂ KIỂM THỬ LOCAL
// ========================================

router.patch(
  '/:id/payment/simulate-success',
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      // Không cho sử dụng API mô phỏng trên production
      if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({
          success: false,
          message: 'API mô phỏng chỉ dành cho môi trường kiểm thử'
        });
      }

      const { id } = req.params;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID đơn hàng không hợp lệ'
        });
      }

      const order = await Order.findById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng'
        });
      }

      if (order.paymentStatus !== 'pending') {
        return res.status(400).json({
          success: false,
          message: 'Đơn hàng không ở trạng thái chờ thanh toán'
        });
      }

      const updatedOrder = await Order.findByIdAndUpdate(
        id,
        {
          $set: {
            paymentStatus: 'paid'
          }
        },
        {
          new: true,
          runValidators: true
        }
      );

      return res.status(200).json({
        success: true,
        message: 'Mô phỏng xác nhận thanh toán thành công',
        data: updatedOrder
      });

    } catch (error) {
      console.error('Lỗi xác nhận thanh toán:', error);

      return res.status(500).json({
        success: false,
        message: 'Không thể xác nhận thanh toán'
      });
    }
  }
);

// ========================================
// 8. ADMIN CỘNG ĐIỂM CHO ĐƠN ĐÃ HOÀN THÀNH
// PATCH /api/orders/:id/award-points
// ========================================

router.patch(
  '/:id/award-points',
  authenticate,
  requireAdmin,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Kiểm tra ID đơn hàng
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          success: false,
          message: 'ID đơn hàng không hợp lệ'
        });
      }

      const order = await Order.findById(id);

      if (!order) {
        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy đơn hàng'
        });
      }

      // Chỉ cộng điểm cho đơn đã hoàn thành
      if (order.orderStatus !== 'completed') {
        return res.status(400).json({
          success: false,
          message: 'Đơn hàng chưa hoàn thành'
        });
      }

      // Phải thanh toán thành công
      if (order.paymentStatus !== 'paid') {
        return res.status(400).json({
          success: false,
          message: 'Đơn hàng chưa thanh toán'
        });
      }

      // Không cho cộng điểm nhiều lần
      if (order.pointsAwarded) {
        return res.status(400).json({
          success: false,
          message: 'Đơn hàng đã được cộng điểm trước đó'
        });
      }

      if (!order.userId) {
        return res.status(400).json({
          success: false,
          message: 'Đơn hàng không có tài khoản khách hàng'
        });
      }

      // 10.000đ tiền hàng = 1 điểm
      const pointsToAward = Math.floor(
        Number(order.subtotal || 0) / 10000
      );

      // Đánh dấu đơn đã được xử lý điểm
      const claimedOrder = await Order.findOneAndUpdate(
        {
          _id: id,
          pointsAwarded: false
        },
        {
          $set: {
            pointsAwarded: true,
            pointsEarned: pointsToAward
          }
        },
        {
          new: true
        }
      );

      if (!claimedOrder) {
        return res.status(400).json({
          success: false,
          message: 'Đơn hàng đã được xử lý điểm'
        });
      }

      // Cộng điểm vào tài khoản khách hàng
      const updatedUser = await User.findByIdAndUpdate(
        order.userId,
        {
          $inc: {
            loyaltyPoints: pointsToAward
          }
        },
        {
          new: true
        }
      );

      // Nếu không tìm thấy User thì trả lại trạng thái
      if (!updatedUser) {
        await Order.findByIdAndUpdate(id, {
          $set: {
            pointsAwarded: false,
            pointsEarned: 0
          }
        });

        return res.status(404).json({
          success: false,
          message: 'Không tìm thấy tài khoản khách hàng'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Cộng điểm thành viên thành công',
        data: {
          orderCode: order.orderCode,
          pointsEarned: pointsToAward,
          pointsAwarded: true,
          totalLoyaltyPoints: updatedUser.loyaltyPoints
        }
      });

    } catch (error) {
      console.error('Lỗi cộng điểm:', error);

      return res.status(500).json({
        success: false,
        message: 'Không thể cộng điểm thành viên'
      });
    }
  }
);

module.exports = router;
