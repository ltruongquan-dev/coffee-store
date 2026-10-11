/**
 * CF STORE - CART PAGE SCRIPT
 */

function formatVND(num) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num);
}

function renderCartItems() {
  const cartContainer = document.getElementById('cart-items-container');
  const emptyState = document.getElementById('cart-empty-state');
  const summaryWrapper = document.getElementById('cart-summary-wrapper');
  const subtotalEl = document.getElementById('cart-subtotal');
  const shippingEl = document.getElementById('cart-shipping');
  const totalEl = document.getElementById('cart-total');

  const cart = getCart();

  if (!cart || cart.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    if (cartContainer) cartContainer.innerHTML = '';
    if (summaryWrapper) summaryWrapper.style.display = 'none';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (summaryWrapper) summaryWrapper.style.display = 'block';

  let subtotal = 0;
  let html = '<div class="cart-items-list">';

  cart.forEach(item => {
    const itemTotal = item.price * (item.quantity || 1);
    subtotal += itemTotal;
    const itemKey = item.cartKey || item.id;

    html += `
      <div class="cart-item-row" data-id="${itemKey}">
        <img class="cart-item-img" src="${item.image || '/assets/images/drink_specialty.jpg'}" alt="${item.name}">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          ${item.note ? `<div class="cart-item-note" style="font-size: 0.8rem; color: #555555; margin-top: 2px;">Ghi chú: <em>${item.note}</em></div>` : ''}
          <div class="cart-item-price">${formatVND(item.price)}</div>
        </div>
        <div class="cart-qty-ctrl">
          <button class="qty-btn" onclick="changeQty('${itemKey}', -1)">-</button>
          <span class="qty-num">${item.quantity || 1}</span>
          <button class="qty-btn" onclick="changeQty('${itemKey}', 1)">+</button>
        </div>
        <button class="btn-remove-item" onclick="removeItem('${itemKey}')" title="Xóa món">Xóa</button>
      </div>
    `;
  });

  html += '</div>';
  if (cartContainer) cartContainer.innerHTML = html;

  const shipping = subtotal > 200000 ? 0 : 25000;
  const total = subtotal + shipping;

  if (subtotalEl) subtotalEl.textContent = formatVND(subtotal);
  if (shippingEl) shippingEl.textContent = shipping === 0 ? 'Miễn phí' : formatVND(shipping);
  if (totalEl) totalEl.textContent = formatVND(total);
}

function changeQty(key, delta) {
  const cart = getCart();
  const item = cart.find(i => (i.cartKey || i.id) === key);
  if (item) {
    item.quantity = (item.quantity || 1) + delta;
    if (item.quantity <= 0) {
      const idx = cart.indexOf(item);
      cart.splice(idx, 1);
    }
    saveCart(cart);
    renderCartItems();
  }
}

function removeItem(key) {
  let cart = getCart();
  cart = cart.filter(i => (i.cartKey || i.id) !== key);
  saveCart(cart);
  renderCartItems();
  showToast('Đã xóa món khỏi giỏ hàng', 'info');
}

document.addEventListener('DOMContentLoaded', () => {
  renderCartItems();

  const checkoutBtn = document.getElementById('btn-checkout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      const user = getAuthUser();
      if (!user) {
        showToast('Vui lòng đăng nhập để tiến hành đặt hàng!', 'error');
        setTimeout(() => {
          window.location.href = '/login/?redirect=/cart/';
        }, 1200);
        return;
      }

      showToast(`Đã nhận đơn hàng của ${user.name}! Barista đang chuẩn bị món...`, 'success');
      localStorage.removeItem('cf_cart');
      updateCartBadge();
      setTimeout(() => {
        renderCartItems();
      }, 1000);
    });
  }
});
