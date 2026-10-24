/**
 * CF STORE - HOME PAGE SCRIPT
 * Dynamically loads Bestseller items from MongoDB API and handles Likes & Cart
 */

function formatVND(num) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

async function loadBestsellerItems() {
  const container = document.getElementById('bestseller-cards-container');
  if (!container) return;

  try {
    const res = await fetch('/api/menu?bestseller=true');
    const json = await res.json();
    const items = json.data || [];

    if (items.length === 0) {
      container.innerHTML = '<p style="text-align:center; color: var(--text-muted); grid-column: 1/-1;">Đang cập nhật danh sách món bán chạy...</p>';
      return;
    }

    // Hiển thị tối đa 4 món bestseller
    const displayItems = items.slice(0, 4);
    let html = '';

    displayItems.forEach(item => {
      const itemId = item._id || item.id;
      html += `
        <div class="bestseller-card">
          <div class="bestseller-card-img">
            <span class="bestseller-badge-tag">🔥 Bestseller</span>
            <img src="${item.image || '/assets/images/home/home-bg.avif'}" alt="${item.name}">
          </div>
          <div class="bestseller-card-body">
            <span class="bestseller-card-category">${item.category}</span>
            <h3 class="bestseller-card-title">${item.name}</h3>
            <p style="font-size: 0.85rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 0.75rem; flex: 1;">
              ${item.description || ''}
            </p>
            <div class="bestseller-card-footer">
              <span class="bestseller-card-price">${formatVND(item.price)}</span>
              <div style="display: flex; gap: 6px; align-items: center;">
                <button class="btn btn-primary btn-sm" onclick="addToCart({ id: '${itemId}', name: '${item.name}', price: ${item.price}, image: '${item.image}' })" title="Thêm vào giỏ">
                  <i class="fa-solid fa-cart-shopping"></i>
                </button>
              </div>
            </div>
          </div>
        </div>
      `;
    });

    container.innerHTML = html;
  } catch (err) {
    console.error('Lỗi khi tải món bestseller:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadBestsellerItems();
});
