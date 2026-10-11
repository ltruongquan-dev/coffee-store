const mongoose = require('mongoose');

const menuItemSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Tên món là bắt buộc'],
    trim: true
  },
  category: {
    type: String,
    required: [true, 'Danh mục là bắt buộc'],
    enum: ['cà phê', 'espresso', 'phindi', 'trà sữa', 'bánh', 'combo bánh nước', 'combo'],
    lowercase: true,
    trim: true
  },
  productGroup: {
    type: String,
    enum: ['nước', 'bánh', 'combo'],
    default: 'nước'
  },
  price: {
    type: Number,
    required: [true, 'Giá món là bắt buộc'],
    min: [0, 'Giá không thể âm']
  },
  description: {
    type: String,
    default: ''
  },
  image: {
    type: String,
    default: '/assets/images/drink_specialty.jpg'
  },
  isBestseller: {
    type: Boolean,
    default: false
  },
  likes: {
    type: Number,
    default: 0
  },
  createdBy: {
    type: String,
    default: 'Admin Quản Trị'
  },
  updatedBy: {
    type: String,
    default: 'Admin Quản Trị'
  }
}, {
  timestamps: true // Tự động tạo và cập nhật createdAt, updatedAt
});

module.exports = mongoose.model('MenuItem', menuItemSchema);
