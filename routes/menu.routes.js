const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const MenuItem = require('../models/MenuItem');

const MENU_JSON_PATH = path.join(__dirname, '..', 'data', 'menu.json');

// Helper đọc và ghi file JSON
function readMenuJson() {
  try {
    if (fs.existsSync(MENU_JSON_PATH)) {
      const data = fs.readFileSync(MENU_JSON_PATH, 'utf8');
      return JSON.parse(data);
    }
  } catch (err) {
    console.error('Lỗi khi đọc file menu.json:', err.message);
  }
  return [];
}

function syncToMenuJson(items) {
  try {
    fs.writeFileSync(MENU_JSON_PATH, JSON.stringify(items, null, 2), 'utf8');
  } catch (err) {
    console.error('Lỗi khi ghi đồng bộ vào menu.json:', err.message);
  }
}

let hasSeeded = false;

// Tự động seed dữ liệu từ menu.json vào MongoDB 1 lần khi khởi động
async function seedMenuIfEmpty() {
  if (hasSeeded) return;
  try {
    const count = await MenuItem.countDocuments();
    if (count === 0) {
      const initialItems = readMenuJson();
      if (initialItems.length > 0) {
        for (const item of initialItems) {
          await MenuItem.create({
            name: item.name,
            category: (item.category || '').toLowerCase().trim(),
            price: item.price,
            description: item.description || '',
            image: item.image || '/assets/images/drink_specialty.jpg',
            isBestseller: !!item.isBestseller,
            likes: item.likes || 0,
            createdBy: item.createdBy || 'Admin Quản Trị',
            updatedBy: item.updatedBy || 'Admin Quản Trị',
            createdAt: item.createdAt ? new Date(item.createdAt) : new Date(),
            updatedAt: item.updatedAt ? new Date(item.updatedAt) : new Date()
          });
        }
      }
    }
    hasSeeded = true;
  } catch (err) {
    console.error('Lỗi khi seed thực đơn vào MongoDB:', err.message);
  }
}

// 1. GET /api/menu - Lấy danh sách thực đơn (tối ưu tốc độ cao với lean query)
router.get('/', async (req, res) => {
  try {
    if (!hasSeeded) {
      await seedMenuIfEmpty();
    }

    const { category, bestseller } = req.query;
    let filter = {};

    if (category && category !== 'all') {
      filter.category = category.toLowerCase().trim();
    }

    if (bestseller === 'true') {
      filter.isBestseller = true;
    }

    const items = await MenuItem.find(filter)
      .sort({ isBestseller: -1, likes: -1, createdAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      count: items.length,
      data: items
    });
  } catch (error) {
    console.error('Lỗi lấy danh sách menu:', error);
    // Fallback đọc trực tiếp file JSON nếu MongoDB chưa phản hồi
    const fallback = readMenuJson();
    return res.status(200).json({
      success: true,
      count: fallback.length,
      data: fallback,
      source: 'json_fallback'
    });
  }
});

function normalizeCategory(cat) {
  if (!cat) return null;
  const c = cat.toLowerCase().trim();
  if (c.includes('cà phê') || c.includes('ca phe') || c === 'coffee') return 'cà phê';
  if (c.includes('espresso') || c.includes('esspresso')) return 'espresso';
  if (c.includes('phindi')) return 'phindi';
  if (c.includes('trà sữa') || c.includes('tra sua') || c.includes('milktea')) return 'trà sữa';
  if (c.includes('combo')) return 'combo bánh nước';
  if (c.includes('bánh') || c.includes('banh') || c.includes('cake') || c.includes('pastry')) return 'bánh';
  return null;
}

// 2. POST /api/menu - Admin thêm món mới vào thực đơn (lưu MongoDB, ghi người tạo và thời gian)
router.post('/', async (req, res) => {
  try {
    const { name, category, price, description, image, isBestseller, adminName } = req.body;

    if (!name || !category || price === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Vui lòng cung cấp đầy đủ: Tên món, Danh mục và Giá món'
      });
    }

    const normCategory = normalizeCategory(category);

    if (!normCategory) {
      return res.status(400).json({
        success: false,
        message: `Danh mục không hợp lệ. Chỉ chấp nhận: cà phê, espresso, phindi, trà sữa, bánh, combo bánh nước`
      });
    }

    const changer = adminName && adminName.trim() ? adminName.trim() : 'Admin Quản Trị';
    const now = new Date();

    const newItem = await MenuItem.create({
      name: name.trim(),
      category: normCategory,
      price: Number(price),
      description: description ? description.trim() : '',
      image: image ? image.trim() : '/assets/images/drink_specialty.jpg',
      isBestseller: isBestseller === true || isBestseller === 'true',
      likes: 0,
      createdBy: changer,
      updatedBy: changer,
      createdAt: now,
      updatedAt: now
    });

    // Đồng bộ ra file JSON
    const allItems = await MenuItem.find({}).sort({ createdAt: -1 });
    syncToMenuJson(allItems);

    return res.status(201).json({
      success: true,
      message: `Đã thêm món "${newItem.name}" vào thực đơn thành công!`,
      data: newItem
    });
  } catch (error) {
    console.error('Lỗi thêm món menu:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi thêm món mới' });
  }
});

// 3. PUT /api/menu/:id - Admin chỉnh sửa món (cập nhật updatedBy và updatedAt)
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, price, description, image, isBestseller, adminName } = req.body;

    const changer = adminName && adminName.trim() ? adminName.trim() : 'Admin Quản Trị';
    const now = new Date();

    const updateFields = {
      updatedBy: changer,
      updatedAt: now
    };

    if (name) updateFields.name = name.trim();
    if (category) {
      const nc = normalizeCategory(category);
      if (nc) updateFields.category = nc;
    }
    if (price !== undefined) updateFields.price = Number(price);
    if (description !== undefined) updateFields.description = description.trim();
    if (image !== undefined) updateFields.image = image.trim();
    if (isBestseller !== undefined) updateFields.isBestseller = isBestseller === true || isBestseller === 'true';

    const updatedItem = await MenuItem.findByIdAndUpdate(id, updateFields, { new: true, runValidators: true });

    if (!updatedItem) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy món cần cập nhật' });
    }

    // Đồng bộ ra JSON
    const allItems = await MenuItem.find({}).sort({ createdAt: -1 });
    syncToMenuJson(allItems);

    return res.status(200).json({
      success: true,
      message: `Đã cập nhật món "${updatedItem.name}" thành công!`,
      data: updatedItem
    });
  } catch (error) {
    console.error('Lỗi cập nhật món menu:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi cập nhật món' });
  }
});

// 4. DELETE /api/menu/:id - Xoá món khỏi thực đơn
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await MenuItem.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy món cần xoá' });
    }

    // Đồng bộ ra JSON
    const allItems = await MenuItem.find({}).sort({ createdAt: -1 });
    syncToMenuJson(allItems);

    return res.status(200).json({
      success: true,
      message: `Đã xoá món "${deleted.name}" khỏi thực đơn!`,
      data: deleted
    });
  } catch (error) {
    console.error('Lỗi xoá món menu:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi xoá món' });
  }
});

// 5. POST /api/menu/:id/like - Thả tim / like món ăn (lưu số like vào MongoDB và JSON)
router.post('/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await MenuItem.findByIdAndUpdate(
      id,
      { $inc: { likes: 1 } },
      { new: true }
    );

    if (!item) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy món để like' });
    }

    // Đồng bộ file JSON
    const allItems = await MenuItem.find({}).sort({ createdAt: -1 });
    syncToMenuJson(allItems);

    return res.status(200).json({
      success: true,
      likes: item.likes,
      message: `Đã thích món "${item.name}"!`
    });
  } catch (error) {
    console.error('Lỗi like món:', error);
    return res.status(500).json({ success: false, message: 'Lỗi server khi like món' });
  }
});

module.exports = router;
