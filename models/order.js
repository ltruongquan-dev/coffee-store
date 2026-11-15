
const mongoose = require('mongoose');

// 1. Cấu trúc từng sản phẩm trong đơn hàng
const orderItemSchema = new mongoose.Schema({
  productId: {
    type: String,
    default: ''
  },
  name: {
    type: String,
    required: true
  },
  image: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  size: {
    type: String,
    default: ''
  },
  toppings: {
    type: String,
    default: ''
  },
  note: {
    type: String,
    default: ''
  }
}, { _id: false });

// 2. Lịch sử thay đổi trạng thái đơn hàng
const statusHistorySchema = new mongoose.Schema({
  status: {
    type: String,
    required: true,
    enum: [
      'pending',
      'confirmed',
      'preparing',
      'delivering',
      'completed',
      'cancelled'
    ]
  },
  note: {
    type: String,
    default: ''
  },
  changedAt: {
    type: Date,
    default: Date.now
  }
}, { _id: false });

// 3. Cấu trúc chính của đơn hàng
const orderSchema = new mongoose.Schema({

  // Mã đơn hàng
  orderCode: {
    type: String,
    required: true,
    unique: true
  },

  // Người đặt hàng
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // Thông tin người nhận
  customer: {
    name: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    address: {
      type: String,
      default: ''
    }
  },

  // Hình thức nhận hàng
  deliveryType: {
    type: String,
    enum: ['delivery', 'pickup'],
    default: 'delivery'
  },

  // Danh sách sản phẩm
  items: {
    type: [orderItemSchema],
    required: true,
    validate: {
      validator: items => items.length > 0,
      message: 'Đơn hàng phải có ít nhất một sản phẩm'
    }
  },

  // Thông tin tiền
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },

  shippingFee: {
    type: Number,
    default: 0,
    min: 0
  },

  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },

  // Thanh toán
  paymentMethod: {
    type: String,
    enum: ['vietqr', 'momo', 'zalopay', 'card'],
    default: 'vietqr'
  },

  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded'],
    default: 'pending'
  },

  //trạng thái cũ
  // Trạng thái đơn hàng (dùng đồng bộ với hệ thống cũ)
status: {
  type: String,
  enum: [
    'pending',
    'confirmed',
    'preparing',
    'delivering',
    'completed',
    'cancelled'
  ],
  default: 'pending'
},

  // Trạng thái đơn hàng
  orderStatus: {
    type: String,
    enum: [
      'pending',
      'confirmed',
      'preparing',
      'delivering',
      'completed',
      'cancelled'
    ],
    default: 'pending'
  },
  // thời gian hoàn thành đơn hàng
  completedAt: {
  type: Date,
  default: null
},

  statusHistory: [statusHistorySchema],


  // Điểm thưởng
  pointsEarned: {
    type: Number,
    default: 0,
    min: 0
  },

  pointsAwarded: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

// 4. Tạo index giúp tìm đơn hàng theo người dùng
orderSchema.index({ userId: 1, createdAt: -1 });

// 5. Xuất Model
module.exports = mongoose.model('Order', orderSchema);
