/**
 * CÁO NGỌT - MENU PAGE SCRIPT (MOBILE-FIRST)
 * - Tối ưu tốc độ tải dữ liệu (in-memory & session cache, lean queries)
 * - Trạng thái tải: "Đang tải..."
 * - Thẻ món: Bỏ like/số like, bỏ nút giỏ hàng và mua ngay
 * - Thẻ món chỉ có 1 nút "+" mở Modal / Bottom Sheet chi tiết món
 * - Modal chi tiết món: Chọn size (S/M/L), tăng giảm số lượng (+/-),
 *   tình trạng còn hàng / hết hàng, thêm ghi chú, nút Thêm vào giỏ và Mua ngay.
 */

let allMenuItems = [];
let currentProductGroup = 'drink'; // 'drink' | 'bakery' | 'combo'
let currentCategory = 'all';
let onlyBestseller = false;

// Trạng thái của Modal chi tiết món
let currentModalItem = null;
let currentModalSize = 'M';
let currentModalQty = 1;
let currentModalToppings = [];

const SIZE_OPTIONS = [
  { key: 'S', label: 'Size S', extra: 0 },
  { key: 'M', label: 'Size M', extra: 6000 },
  { key: 'L', label: 'Size L', extra: 12000 }
];

const TOPPING_OPTIONS = [
  { key: 'pearl_black', label: 'Trân châu đường đen', price: 5000 },
  { key: 'pearl_white', label: 'Trân châu trắng 3Q', price: 5000 },
  { key: 'pudding', label: 'Pudding trứng', price: 6000 },
  { key: 'cheese_foam', label: 'Kem Macchiato Cheese', price: 10000 },
  { key: 'full_topping', label: 'Full Topping (Đầy đủ loại)', price: 15000, isFull: true }
];

function formatVND(num) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
}

function formatDateVN(dateStr) {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' +
         d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
}

/**
 * Tải dữ liệu thực đơn từ server
 * Tối ưu tốc độ: tải từ cache trước, sau đó fetch API đồng bộ ngầm
 */
async function fetchMenuData() {
  const gridContainer = document.getElementById('menu-items-grid');
  if (!gridContainer) return;

  // Kiểm tra cache để render ngay lập tức nếu đã có dữ liệu
  try {
    const cached = sessionStorage.getItem('cf_menu_cache');
    if (cached) {
      allMenuItems = JSON.parse(cached);
      if (allMenuItems && allMenuItems.length > 0) {
        renderMenuCards(false);
      }
    }
  } catch (e) {
    // Bỏ qua lỗi cache nếu có
  }

  // Nếu chưa có dữ liệu trong cache, hiển thị thông báo "Đang tải..."
  if (!allMenuItems || allMenuItems.length === 0) {
    gridContainer.innerHTML = '<div class="menu-loading-spinner"><div class="spinner-circle"></div><span>Đang tải...</span></div>';
  }

  try {
    const res = await fetch('/api/menu');
    const json = await res.json();
    if (json.success && Array.isArray(json.data)) {
      allMenuItems = json.data;
      try {
        sessionStorage.setItem('cf_menu_cache', JSON.stringify(allMenuItems));
      } catch (e) {}
      renderMenuCards(false);
      checkAdminPermissionsUI();
    }
  } catch (err) {
    console.error('Lỗi khi tải thực đơn:', err);
    if (!allMenuItems || allMenuItems.length === 0) {
      gridContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: #000000; font-weight: 700; padding: 2.5rem 0;">Không thể kết nối máy chủ để tải thực đơn. Vui lòng thử lại sau!</div>';
    }
  }
}

function checkAdminPermissionsUI() {
  const adminBtnContainer = document.getElementById('admin-actions-bar');
  if (adminBtnContainer) {
    const isAuthorized = typeof isUserAuthorized === 'function' ? isUserAuthorized() : false;
    adminBtnContainer.style.display = isAuthorized ? 'block' : 'none';
  }
}

function filterItems() {
  let list = allMenuItems;

  // 1. Lọc theo Nhóm sản phẩm lớn (Nước, Bánh, Combo Bánh Nước)
  if (currentProductGroup === 'drink') {
    list = list.filter(item => {
      const group = (item.productGroup || '').toLowerCase().trim();
      const cat = (item.category || '').toLowerCase().trim();
      if (group === 'nước') return true;
      return cat !== 'bánh' && !cat.includes('bánh') && !cat.includes('combo');
    });

    if (currentCategory !== 'all') {
      list = list.filter(item => {
        const cat = (item.category || '').toLowerCase().trim();
        return cat === currentCategory || cat.includes(currentCategory);
      });
    }
  } else if (currentProductGroup === 'bakery') {
    list = list.filter(item => {
      const group = (item.productGroup || '').toLowerCase().trim();
      const cat = (item.category || '').toLowerCase().trim();
      return group === 'bánh' || cat === 'bánh' || cat.includes('bánh');
    });
  } else if (currentProductGroup === 'combo') {
    list = list.filter(item => {
      const group = (item.productGroup || '').toLowerCase().trim();
      const cat = (item.category || '').toLowerCase().trim();
      return group === 'combo' || cat.includes('combo');
    });
  }

  // 2. Lọc theo Best seller nếu được chọn
  if (onlyBestseller) {
    list = list.filter(item => !!item.isBestseller);
  }

  return list;
}

/**
 * Hiển thị danh sách thẻ món (Mobile First):
 * - Không có icon like, không có số like
 * - Không có nút Giỏ hàng và Mua ngay ở thẻ
 * - Chỉ có 1 dấu "+" nổi bật để mở Modal chi tiết món
 */
function renderMenuCards(animate = false) {
  const gridContainer = document.getElementById('menu-items-grid');
  if (!gridContainer) return;

  if (animate) {
    gridContainer.style.opacity = '0.4';
  }

  const filtered = filterItems();

  if (filtered.length === 0) {
    gridContainer.innerHTML = '<div style="grid-column: 1/-1; text-align: center; padding: 3rem 0; color: #000000; font-size: 1rem; font-weight: 600;">Không tìm thấy món nào trong danh mục này.</div>';
    if (animate) {
      setTimeout(() => { gridContainer.style.opacity = '1'; }, 100);
    }
    return;
  }

  const isAuthorized = typeof isUserAuthorized === 'function' ? isUserAuthorized() : false;
  let html = '';

  filtered.forEach(item => {
    const itemId = item._id || item.id;
    const isBs = !!item.isBestseller;
    const isAvailable = item.status !== 'out_of_stock' && item.isAvailable !== false && item.inStock !== false;
    const changer = item.updatedBy || item.createdBy || 'Admin Quản Trị';
    const updatedTime = formatDateVN(item.updatedAt || item.createdAt);

    html += `
      <div class="menu-card ${isBs ? 'is-bestseller-card' : ''}" data-category="${item.category}" data-id="${itemId}" onclick="openItemDetailModal('${itemId}')">
        <div class="menu-card-img-wrap">
          <img src="${item.image || '/assets/images/home/home-bg.avif'}" alt="${item.name}" loading="lazy">
          ${isBs ? '<span class="card-bestseller-badge">Best seller</span>' : ''}
          ${!isAvailable ? '<span class="card-soldout-badge">Hết hàng</span>' : ''}
        </div>
        <div class="menu-card-body">
          <h3 class="menu-card-title">${item.name}</h3>

          <div class="card-meta-row">
            ${isBs ? '<span class="card-bestseller-label">Best seller</span>' : '<span class="card-meta-spacer"></span>'}
          </div>

          <!-- Dòng đáy thẻ: Giá nổi bật và duy nhất 1 dấu + để chọn món -->
          <div class="menu-card-bottom-row">
            <div class="menu-price">${formatVND(item.price)}</div>
            <button type="button" class="btn-card-plus" onclick="event.stopPropagation(); openItemDetailModal('${itemId}')" title="Chọn món ${item.name}" aria-label="Thêm ${item.name}">
              <i class="fa-solid fa-plus"></i>
            </button>
          </div>

          ${isAuthorized ? `
            <div class="admin-audit-info" title="Lưu trữ trong MongoDB">
              <div>Ngày chỉnh sửa: <strong>${updatedTime}</strong></div>
              <div>Bởi: <strong>${changer}</strong></div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  });

  gridContainer.innerHTML = html;

  if (animate) {
    setTimeout(() => {
      gridContainer.style.opacity = '1';
    }, 120);
  }
}

/**
 * =========================================================================
 * MODAL / BOTTOM SHEET CHI TIẾT MÓN ĂN (MOBILE FIRST)
 * =========================================================================
 */
function openItemDetailModal(itemId) {
  const item = allMenuItems.find(i => String(i._id || i.id) === String(itemId));
  if (!item) return;

  currentModalItem = item;
  currentModalSize = 'M';
  currentModalQty = 1;
  currentModalToppings = [];

  renderItemDetailModal();

  const overlay = document.getElementById('item-detail-modal-overlay');
  if (overlay) {
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }
}

function closeItemDetailModal() {
  const overlay = document.getElementById('item-detail-modal-overlay');
  if (overlay) {
    overlay.classList.remove('active');
    document.body.style.overflow = '';
  }
  currentModalItem = null;
  currentModalToppings = [];
}

function updateModalQty(delta) {
  currentModalQty = Math.max(1, currentModalQty + delta);
  const qtyVal = document.getElementById('modal-qty-val');
  if (qtyVal) qtyVal.textContent = currentModalQty;
  updateModalPriceDisplay();
}

function selectModalSize(sizeKey) {
  currentModalSize = sizeKey;
  const chips = document.querySelectorAll('.modal-size-chip');
  chips.forEach(chip => {
    chip.classList.toggle('active', chip.getAttribute('data-size') === sizeKey);
  });
  updateModalPriceDisplay();
}

function toggleModalTopping(toppingKey) {
  if (toppingKey === 'full_topping') {
    if (currentModalToppings.includes('full_topping')) {
      currentModalToppings = [];
    } else {
      currentModalToppings = ['full_topping'];
    }
  } else {
    // Nếu đang chọn full_topping mà bấm topping lẻ thì chuyển sang danh sách lẻ
    currentModalToppings = currentModalToppings.filter(k => k !== 'full_topping');
    const idx = currentModalToppings.indexOf(toppingKey);
    if (idx > -1) {
      currentModalToppings.splice(idx, 1);
    } else {
      currentModalToppings.push(toppingKey);
    }
  }

  const chips = document.querySelectorAll('.modal-topping-chip');
  chips.forEach(chip => {
    const key = chip.getAttribute('data-topping');
    chip.classList.toggle('active', currentModalToppings.includes(key));
  });

  updateModalPriceDisplay();
}

function calculateCurrentPrice() {
  if (!currentModalItem) return 0;
  const base = Number(currentModalItem.price) || 0;
  const sizeObj = SIZE_OPTIONS.find(s => s.key === currentModalSize);
  const extra = sizeObj ? sizeObj.extra : 0;

  let toppingsExtra = 0;
  currentModalToppings.forEach(tKey => {
    const tObj = TOPPING_OPTIONS.find(t => t.key === tKey);
    if (tObj) toppingsExtra += tObj.price;
  });

  return (base + extra + toppingsExtra) * currentModalQty;
}

function updateModalPriceDisplay() {
  const priceEl = document.getElementById('modal-total-price');
  if (priceEl) {
    priceEl.textContent = formatVND(calculateCurrentPrice());
  }
}

function renderItemDetailModal() {
  const content = document.getElementById('modal-body-content');
  if (!content || !currentModalItem) return;

  const item = currentModalItem;
  const isAvailable = item.status !== 'out_of_stock' && item.isAvailable !== false && item.inStock !== false;
  const isBs = !!item.isBestseller;
  const isDrink = currentProductGroup === 'drink' || (item.productGroup === 'nước') || (item.category && !item.category.includes('bánh') && !item.category.includes('combo'));
  const isMilkTea = isDrink && item.category && (
    item.category.toLowerCase().includes('trà sữa') ||
    item.category.toLowerCase().includes('tra sua') ||
    item.name.toLowerCase().includes('trà sữa') ||
    item.name.toLowerCase().includes('tra sua')
  );

  const basePrice = Number(item.price) || 0;

  content.innerHTML = `
    <div class="modal-detail-img-wrap">
      <img src="${item.image || '/assets/images/home/home-bg.avif'}" alt="${item.name}">
      ${isBs ? '<span class="modal-bestseller-badge">Best seller</span>' : ''}
    </div>

    <div class="modal-detail-body">
      <div class="modal-detail-header">
        <div class="modal-title-group">
          <h2 class="modal-detail-title">${item.name}</h2>
          <div style="display: flex; gap: 8px; align-items: center; margin-top: 4px;">
            <span class="modal-detail-cat">${item.category || 'Món đặc trưng'}</span>
          </div>
        </div>
        <div class="modal-stock-status ${isAvailable ? 'in-stock' : 'out-of-stock'}">
          <i class="fa-solid ${isAvailable ? 'fa-circle-check' : 'fa-circle-xmark'}"></i>
          <span>${isAvailable ? 'Còn hàng' : 'Đã hết hàng'}</span>
        </div>
      </div>

      ${item.description ? `<p class="modal-detail-desc">${item.description}</p>` : ''}

      <!-- Chọn kích cỡ (Size S, M, L hiển thị giá chuẩn, không dùng dấu +) -->
      ${isDrink ? `
        <div class="modal-section">
          <label class="modal-section-title">Chọn kích cỡ (Size):</label>
          <div class="modal-sizes-grid">
            ${SIZE_OPTIONS.map(opt => {
              const fullPrice = basePrice + opt.extra;
              return `
                <button type="button" class="modal-size-chip ${currentModalSize === opt.key ? 'active' : ''}" data-size="${opt.key}" onclick="selectModalSize('${opt.key}')">
                  <span class="size-name">${opt.label}</span>
                  <span class="size-price">${formatVND(fullPrice)}</span>
                </button>
              `;
            }).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Chọn Topping & Full Topping (dành cho phần Trà Sữa) -->
      ${isMilkTea ? `
        <div class="modal-section">
          <div style="display: flex; justify-content: space-between; align-items: baseline;">
            <label class="modal-section-title">Chọn Topping:</label>
            <span style="font-size: 0.75rem; color: #666;">(Có thể chọn nhiều)</span>
          </div>
          <div class="modal-toppings-grid">
            ${TOPPING_OPTIONS.map(top => `
              <button type="button" 
                class="modal-topping-chip ${top.isFull ? 'full-topping-chip' : ''} ${currentModalToppings.includes(top.key) ? 'active' : ''}" 
                data-topping="${top.key}" 
                onclick="toggleModalTopping('${top.key}')">
                <span class="topping-name">${top.label}</span>
                <span class="topping-price">${formatVND(top.price)}</span>
              </button>
            `).join('')}
          </div>
        </div>
      ` : ''}

      <!-- Thay đổi số lượng bằng nút +, - -->
      <div class="modal-section modal-qty-section">
        <label class="modal-section-title">Số lượng:</label>
        <div class="modal-qty-counter">
          <button type="button" class="modal-qty-btn" onclick="updateModalQty(-1)" aria-label="Giảm số lượng"><i class="fa-solid fa-minus"></i></button>
          <span class="modal-qty-val" id="modal-qty-val">${currentModalQty}</span>
          <button type="button" class="modal-qty-btn" onclick="updateModalQty(1)" aria-label="Tăng số lượng"><i class="fa-solid fa-plus"></i></button>
        </div>
      </div>

      <!-- Thêm ghi chú -->
      <div class="modal-section">
        <label for="modal-item-note" class="modal-section-title">Thêm ghi chú cho quán:</label>
        <textarea id="modal-item-note" class="modal-note-input" rows="2" placeholder="Ghi chú thêm"></textarea>
      </div>

      <!-- Tổng tiền tạm tính -->
      <div class="modal-summary-row">
        <span>Tổng cộng:</span>
        <span class="modal-total-price" id="modal-total-price">${formatVND(calculateCurrentPrice())}</span>
      </div>

      <!-- 2 Nút hành động: Thêm vào giỏ hàng và Mua ngay -->
      <div class="modal-actions-row">
        ${isAvailable ? `
          <button type="button" class="btn-modal-cart" onclick="confirmModalAddToCart()">
            <i class="fa-solid fa-cart-shopping"></i> Thêm vào giỏ
          </button>
          <button type="button" class="btn-modal-buy" onclick="confirmModalBuyNow()">
            Mua ngay
          </button>
        ` : `
          <button type="button" class="btn-modal-disabled" disabled>
            <i class="fa-solid fa-ban"></i> Món hiện đã hết hàng
          </button>
        `}
      </div>
    </div>
  `;
}

function getModalPayload() {
  if (!currentModalItem) return null;
  const noteEl = document.getElementById('modal-item-note');
  const note = noteEl ? noteEl.value.trim() : '';
  const sizeObj = SIZE_OPTIONS.find(s => s.key === currentModalSize);
  const sizeExtra = sizeObj ? sizeObj.extra : 0;

  let toppingsExtra = 0;
  const toppingNames = [];
  currentModalToppings.forEach(tKey => {
    const tObj = TOPPING_OPTIONS.find(t => t.key === tKey);
    if (tObj) {
      toppingsExtra += tObj.price;
      toppingNames.push(tObj.label);
    }
  });

  const unitPrice = (Number(currentModalItem.price) || 0) + sizeExtra + toppingsExtra;
  const itemId = currentModalItem._id || currentModalItem.id;
  const isDrink = currentProductGroup === 'drink' || (currentModalItem.productGroup === 'nước') || (currentModalItem.category && !currentModalItem.category.includes('bánh') && !currentModalItem.category.includes('combo'));

  const toppingKeyPart = currentModalToppings.length ? `_${currentModalToppings.slice().sort().join('-')}` : '';
  const cartKey = isDrink ? `${itemId}_${currentModalSize}${toppingKeyPart}` : itemId;

  let displayName = currentModalItem.name;
  if (isDrink) {
    displayName += ` (${currentModalSize}`;
    if (toppingNames.length > 0) {
      displayName += ` • ${toppingNames.join(', ')}`;
    }
    displayName += `)`;
  }

  return {
    id: itemId,
    cartKey: cartKey,
    name: displayName,
    price: unitPrice,
    size: isDrink ? currentModalSize : '',
    toppings: toppingNames.join(', '),
    note: note,
    quantity: currentModalQty,
    image: currentModalItem.image || '/assets/images/home/home-bg.avif'
  };
}

function confirmModalAddToCart() {
  const payload = getModalPayload();
  if (!payload) return;
  if (typeof addToCart === 'function') {
    addToCart(payload);
  }
  closeItemDetailModal();
}

function confirmModalBuyNow() {
  const payload = getModalPayload();
  if (!payload) return;
  if (typeof addToCart === 'function') {
    addToCart(payload);
  }
  closeItemDetailModal();
  setTimeout(() => {
    window.location.href = '/cart/';
  }, 200);
}

// =========================================================================
// KHỞI TẠO SỰ KIỆN TRANG THỰC ĐƠN
// =========================================================================
document.addEventListener('DOMContentLoaded', () => {
  fetchMenuData();

  // 1. Nhóm sản phẩm lớn (Nước | Bánh | Combo Bánh Nước)
  const groupBtns = document.querySelectorAll('.group-tab-btn[data-group]');
  const drinksSubtabs = document.getElementById('drinks-subtabs');

  groupBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      groupBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentProductGroup = btn.getAttribute('data-group');

      if (currentProductGroup === 'drink') {
        if (drinksSubtabs) drinksSubtabs.style.display = 'flex';
      } else {
        if (drinksSubtabs) drinksSubtabs.style.display = 'none';
      }

      renderMenuCards(true);
    });
  });

  // 2. Danh mục con trong nhóm Nước
  const tabs = document.querySelectorAll('.tab-btn[data-cat]');
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      currentCategory = tab.getAttribute('data-cat');
      renderMenuCards(true);
    });
  });

  // 3. Best seller toggle tab
  const bsBtn = document.getElementById('btn-filter-bestseller');
  if (bsBtn) {
    bsBtn.addEventListener('click', () => {
      onlyBestseller = !onlyBestseller;
      bsBtn.classList.toggle('active', onlyBestseller);
      renderMenuCards(true);
    });
  }

  // 4. Modal Close Listener
  const closeBtn = document.getElementById('modal-close-btn');
  if (closeBtn) {
    closeBtn.addEventListener('click', closeItemDetailModal);
  }

  const modalOverlay = document.getElementById('item-detail-modal-overlay');
  if (modalOverlay) {
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) {
        closeItemDetailModal();
      }
    });
  }

  // Phím ESC để đóng modal
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeItemDetailModal();
    }
  });
});
