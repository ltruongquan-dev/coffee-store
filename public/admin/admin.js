/**
 * CF STORE - ADMIN DASHBOARD SCRIPT
 * Manages adding, editing, deleting menu items, syncing with MongoDB & data/menu.json,
 * and tracking updatedBy / updatedAt audit logs.
 */

let editingItemId = null;

function formatVND(num) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

function formatDateVN(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
         d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

async function loadAdminMenuItems() {
  const tbody = document.getElementById('admin-menu-tbody');
  if (!tbody) return;

  try {
    const res = await fetch('/api/menu');
    const json = await res.json();
    const items = json.data || [];

    // Cập nhật thống kê
    document.getElementById('stat-total-items').textContent = items.length;
    const bsCount = items.filter(i => i.isBestseller).length;
    document.getElementById('stat-bestsellers').textContent = bsCount;
    const totalLikes = items.reduce((sum, i) => sum + (i.likes || 0), 0);
    document.getElementById('stat-likes').textContent = totalLikes;

    if (items.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted);">Chưa có món nào trong thực đơn.</td></tr>';
      return;
    }

    let html = '';
    items.forEach((item, index) => {
      const itemId = item._id || item.id;
      const changer = item.updatedBy || item.createdBy || 'Admin Quản Trị';
      const updatedTime = formatDateVN(item.updatedAt || item.createdAt);

      html += `
        <tr>
          <td>${index + 1}</td>
          <td>
            <div style="display: flex; align-items: center; gap: 10px;">
              <img src="${item.image || '/assets/images/drink_specialty.jpg'}" alt="${item.name}" class="table-img">
              <div>
                <strong>${item.name}</strong>
                ${item.isBestseller ? '<span class="badge-bestseller-tag" style="margin-left: 5px; font-size: 0.68rem; padding: 2px 6px;">Best seller</span>' : ''}
              </div>
            </div>
          </td>
          <td><span class="table-badge-cat">${item.category}</span></td>
          <td><strong>${formatVND(item.price)}</strong></td>
          <td>${item.likes || 0}</td>
          <td>
            <div class="table-audit-meta">
              <div>Người sửa: <strong>${changer}</strong></div>
              <div>Thời gian: <span>${updatedTime}</span></div>
            </div>
          </td>
          <td>
            <div class="table-actions">
              <button class="btn-table-action edit" onclick="startEditItem('${itemId}')" title="Chỉnh sửa món">Sửa</button>
              <button class="btn-table-action" onclick="toggleBestseller('${itemId}', ${!item.isBestseller})" title="Bật/Tắt Bestseller">
                ${item.isBestseller ? 'Bỏ BS' : 'Đặt BS'}
              </button>
              <button class="btn-table-action delete" onclick="deleteMenuItem('${itemId}', '${item.name}')" title="Xóa món">Xóa</button>
            </div>
          </td>
        </tr>
      `;
    });

    tbody.innerHTML = html;
  } catch (err) {
    console.error('Lỗi khi tải danh sách menu:', err);
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--accent-red);">Lỗi kết nối máy chủ!</td></tr>';
  }
}

// Xử lý Form thêm / sửa món
async function handleMenuFormSubmit(e) {
  e.preventDefault();

  const name = document.getElementById('form-item-name').value.trim();
  const category = document.getElementById('form-item-category').value;
  const price = Number(document.getElementById('form-item-price').value);
  const description = document.getElementById('form-item-desc').value.trim();
  const image = document.getElementById('form-item-image').value.trim() || '/assets/images/drink_specialty.jpg';
  const isBestseller = document.getElementById('form-item-bestseller').checked;
  const adminName = document.getElementById('form-admin-name').value.trim() || 'Admin Quản Trị';

  if (!name || !category || isNaN(price)) {
    showToast('Vui lòng điền đầy đủ Tên món, Danh mục và Giá!', 'error');
    return;
  }

  const payload = {
    name,
    category,
    price,
    description,
    image,
    isBestseller,
    adminName
  };

  const submitBtn = document.getElementById('btn-submit-form');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Đang lưu vào MongoDB... ⏳';

  try {
    let url = '/api/menu';
    let method = 'POST';

    if (editingItemId) {
      url = `/api/menu/${editingItemId}`;
      method = 'PUT';
    }

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const json = await res.json();
    if (!json.success) {
      throw new Error(json.message || 'Lỗi khi lưu dữ liệu');
    }

    showToast(json.message || 'Đã lưu thành công!', 'success');
    resetForm();
    loadAdminMenuItems();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingItemId ? 'Cập Nhật Món ✓' : 'Thêm Món Vào Thực Đơn ✓';
  }
}

async function startEditItem(id) {
  try {
    const res = await fetch('/api/menu');
    const json = await res.json();
    const item = (json.data || []).find(i => (i._id || i.id) === id);

    if (!item) return;

    editingItemId = id;
    document.getElementById('form-item-name').value = item.name;
    document.getElementById('form-item-category').value = item.category;
    document.getElementById('form-item-price').value = item.price;
    document.getElementById('form-item-desc').value = item.description || '';
    document.getElementById('form-item-image').value = item.image || '';
    document.getElementById('form-item-bestseller').checked = !!item.isBestseller;

    document.getElementById('form-title-text').textContent = 'Chỉnh Sửa Món';
    document.getElementById('btn-submit-form').textContent = 'Cập Nhật Món (Lưu DB) ✓';
    document.getElementById('btn-cancel-edit').style.display = 'inline-block';

    window.scrollTo({ top: 150, behavior: 'smooth' });
  } catch (err) {
    console.error(err);
  }
}

function resetForm() {
  editingItemId = null;
  document.getElementById('admin-menu-form').reset();
  document.getElementById('form-title-text').textContent = 'Thêm Món Mới';
  document.getElementById('btn-submit-form').textContent = 'Thêm Món Vào Thực Đơn (Lưu DB) ✓';
  document.getElementById('btn-cancel-edit').style.display = 'none';

  // Giữ lại tên admin nếu có đăng nhập
  const currentUser = getAuthUser();
  if (currentUser) {
    document.getElementById('form-admin-name').value = currentUser.name;
  }
}

async function toggleBestseller(id, newState) {
  const adminUser = getAuthUser();
  const adminName = adminUser ? adminUser.name : 'Admin Quản Trị';

  try {
    const res = await fetch(`/api/menu/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isBestseller: newState, adminName })
    });
    const json = await res.json();
    if (json.success) {
      showToast(`Đã ${newState ? 'đánh dấu' : 'bỏ'} Bestseller cho món!`, 'success');
      loadAdminMenuItems();
    }
  } catch (err) {
    showToast('Không thể cập nhật Bestseller', 'error');
  }
}

async function deleteMenuItem(id, name) {
  if (!confirm(`Bạn có chắc muốn xoá món "${name}" khỏi thực đơn? Dữ liệu trên MongoDB và menu.json sẽ được cập nhật.`)) {
    return;
  }

  try {
    const res = await fetch(`/api/menu/${id}`, { method: 'DELETE' });
    const json = await res.json();
    if (json.success) {
      showToast(`Đã xoá món "${name}" thành công!`, 'info');
      loadAdminMenuItems();
    }
  } catch (err) {
    showToast('Lỗi khi xoá món', 'error');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  // Điền tên Admin nếu có user đăng nhập
  const currentUser = getAuthUser();
  const adminInput = document.getElementById('form-admin-name');
  if (adminInput && currentUser) {
    adminInput.value = currentUser.name;
  }

  const form = document.getElementById('admin-menu-form');
  if (form) {
    form.addEventListener('submit', handleMenuFormSubmit);
  }

  const cancelBtn = document.getElementById('btn-cancel-edit');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', resetForm);
  }

  loadAdminMenuItems();
});
