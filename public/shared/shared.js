/**
 * CÁO NGỌT - SHARED SCRIPT
 * Quản lý Drawer di động, Giỏ hàng, Auth, Thông báo Toast, Phân quyền Admin
 */

// 1. Toast Notification Utility (Không dùng emoji icon)
function showToast(message, type = 'info', duration = 3200) {
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;

  toast.innerHTML = `
    <div style="flex: 1; font-weight: 600; color: #000000;">${message}</div>
    <button style="background: none; border: none; cursor: pointer; color: #000000; font-weight: 800; font-size: 1rem; padding-left: 8px;" onclick="this.parentElement.remove()">✕</button>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// 2. Simulated SMS Popup Modal (Xác nhận SMS SSM)
function showSmsNotificationModal(phone, otpCode, onAutoFill) {
  const oldModal = document.getElementById('sms-modal-preview');
  if (oldModal) oldModal.remove();

  const modal = document.createElement('div');
  modal.id = 'sms-modal-preview';
  modal.className = 'sms-modal-backdrop';
  modal.innerHTML = `
    <div class="sms-phone-card">
      <div class="sms-phone-header">
        <div>
          <strong style="display: block; font-size: 0.95rem; font-weight: 800; color: #000000;">Tin nhắn hệ thống xác thực (SSM)</strong>
          <span style="font-size: 0.8rem; color: #000000; font-weight: 500;">Gửi tới: ${phone}</span>
        </div>
      </div>
      <div class="sms-bubble">
        <p style="margin-bottom: 6px; font-weight: 600;">[CÁO NGỌT] Mã xác thực đăng ký tài khoản của bạn là:</p>
        <div class="sms-code-highlight">${otpCode}</div>
        <p style="font-size: 0.8rem; color: #000000; font-weight: 400; margin-top: 4px;">Mã có hiệu lực trong 5 phút. Vui lòng không chia sẻ mã này.</p>
      </div>
      <div style="display: flex; gap: 8px;">
        <button id="btn-copy-otp" class="btn btn-primary btn-sm" style="flex: 1;">Sao chép mã (${otpCode})</button>
        <button id="btn-close-sms" class="btn btn-outline btn-sm">Đóng</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  const copyBtn = modal.querySelector('#btn-copy-otp');
  const closeBtn = modal.querySelector('#btn-close-sms');

  copyBtn.addEventListener('click', () => {
    navigator.clipboard.writeText(otpCode).catch(() => {});
    showToast(`Đã sao chép mã OTP: ${otpCode}`, 'success');
    if (typeof onAutoFill === 'function') {
      onAutoFill(otpCode);
    }
    modal.remove();
  });

  closeBtn.addEventListener('click', () => modal.remove());
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.remove();
  });
}

// 3. Cart State Helper
function getCart() {
  try {
    return JSON.parse(localStorage.getItem('cf_cart')) || [];
  } catch (e) {
    return [];
  }
}

function saveCart(cart) {
  localStorage.setItem('cf_cart', JSON.stringify(cart));
  updateCartBadge();
}

function updateCartBadge() {
  const cart = getCart();
  const totalCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
  const badges = document.querySelectorAll('.cart-badge');
  badges.forEach(b => {
    b.textContent = totalCount;
    b.style.display = totalCount > 0 ? 'inline-flex' : 'none';
  });
}

function addToCart(product) {
  const cart = getCart();
  const key = product.cartKey || product.id;
  const qty = product.quantity || 1;
  const existing = cart.find(i => (i.cartKey || i.id) === key);
  if (existing) {
    existing.quantity = (existing.quantity || 1) + qty;
    if (product.note && !existing.note) existing.note = product.note;
  } else {
    cart.push({ ...product, cartKey: key, quantity: qty });
  }
  saveCart(cart);
  showToast(`Đã thêm "${product.name}" vào giỏ hàng`, 'success');
}

// Helper mua ngay: thêm vào giỏ và chuyển đến trang giỏ hàng
function buyNow(product) {
  addToCart(product);
  setTimeout(() => {
    window.location.href = '/cart/';
  }, 250);
}

// 4. Like / Yêu thích món ăn (Lưu vào MongoDB và cập nhật giao diện)
async function likeMenuItem(id, btn) {
  try {
    const res = await fetch(`/api/menu/${id}/like`, { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      if (btn) {
        const countSpan = btn.querySelector('.like-count');
        if (countSpan) countSpan.textContent = data.likes;
        btn.classList.add('liked');
        const icon = btn.querySelector('i');
        if (icon) {
          icon.className = 'fa-solid fa-thumbs-up';
        }
      }
      showToast('Cảm ơn bạn đã thích món này!', 'info');
    }
  } catch (err) {
    console.error('Lỗi khi like món:', err);
  }
}

// 4. Auth State Helper & Phân quyền Admin
function getAuthUser() {
  try {
    const userStr = localStorage.getItem('cf_user');
    return userStr ? JSON.parse(userStr) : null;
  } catch (e) {
    return null;
  }
}

function isUserAuthorized() {
  const user = getAuthUser();
  if (!user) return false;
  return user.role === 'admin' || user.role === 'owner' || user.phone === '0909000000';
}

function logoutUser() {
  localStorage.removeItem('cf_token');
  localStorage.removeItem('cf_user');
  showToast('Đã đăng xuất tài khoản thành công', 'info');
  setTimeout(() => {
    window.location.reload();
  }, 600);
}

// 5. Initialize Navbar and Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  updateCartBadge();

  // Mobile drawer toggle
  const hamburgerBtn = document.getElementById('hamburger-btn');
  const mobileDrawer = document.getElementById('mobile-drawer');
  const mobileOverlay = document.getElementById('mobile-nav-overlay');

  if (hamburgerBtn && mobileDrawer && mobileOverlay) {
    function toggleDrawer(open) {
      const isOpen = open !== undefined ? open : !mobileDrawer.classList.contains('open');
      hamburgerBtn.classList.toggle('active', isOpen);
      mobileDrawer.classList.toggle('open', isOpen);
      mobileOverlay.classList.toggle('open', isOpen);
      document.body.style.overflow = isOpen ? 'hidden' : '';
    }

    hamburgerBtn.addEventListener('click', () => toggleDrawer());
    mobileOverlay.addEventListener('click', () => toggleDrawer(false));
  }

  // User menu toggle & auth render (Không icon emoji)
  const userBtn = document.getElementById('user-menu-btn');
  const userDropdown = document.getElementById('user-dropdown');
  const currentUser = getAuthUser();
  const hasAdminPerm = isUserAuthorized();

  if (userDropdown) {
    if (currentUser) {
      userDropdown.innerHTML = `
        <div class="dropdown-header">
          <div class="user-name">${currentUser.name}</div>
          <div class="user-phone">SĐT: ${currentUser.phone} ${hasAdminPerm ? '<b style="color:#000000;">[ADMIN]</b>' : ''}</div>
        </div>
        <a href="/cart/" class="dropdown-item">Giỏ hàng của bạn</a>
        ${hasAdminPerm ? '<a href="/admin/" class="dropdown-item" style="font-weight: 800;">Quản trị thực đơn (Admin)</a>' : ''}
        <div class="dropdown-divider"></div>
        <a href="javascript:void(0)" onclick="logoutUser()" class="dropdown-item" style="font-weight: 700;">Đăng xuất</a>
      `;
    } else {
      userDropdown.innerHTML = `
        <div class="dropdown-header">
          <div class="user-name">Tài khoản khách hàng</div>
          <div class="user-phone">Đăng nhập để nhận ưu đãi</div>
        </div>
        <a href="/login/" class="dropdown-item">Đăng nhập</a>
        <a href="/register/" class="dropdown-item">Đăng ký tài khoản</a>
      `;
    }
  }

  if (userBtn && userDropdown) {
    userBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userDropdown.classList.toggle('show');
    });

    document.addEventListener('click', (e) => {
      if (!userDropdown.contains(e.target) && e.target !== userBtn) {
        userDropdown.classList.remove('show');
      }
    });
  }

  // Mobile Auth Buttons
  const mobileAuthContainer = document.getElementById('mobile-drawer-auth');
  if (mobileAuthContainer) {
    if (currentUser) {
      mobileAuthContainer.innerHTML = `
        <div style="font-size: 0.9rem; margin-bottom: 0.5rem; font-weight: 600;">
          Tài khoản: <strong>${currentUser.name}</strong> ${hasAdminPerm ? '<b>[Admin]</b>' : ''}
        </div>
        ${hasAdminPerm ? `
          <a href="/admin/" class="btn btn-outline btn-block btn-sm" style="margin-bottom: 0.5rem; font-weight: 800;">
            Quản trị thực đơn (Admin)
          </a>
        ` : ''}
        <button class="btn btn-outline btn-block btn-sm" onclick="logoutUser()">
          Đăng xuất
        </button>
      `;
    } else {
      mobileAuthContainer.innerHTML = `
        <a href="/login/" class="btn btn-outline btn-block" style="margin-bottom: 0.5rem;">Đăng nhập</a>
        <a href="/register/" class="btn btn-primary btn-block">Đăng ký thành viên</a>
      `;
    }
  }
});
