/**
 * FOXTAIL - CART & ONLINE PAYMENT PROCESS SCRIPT
 * Multi-Step Checkout:
 * - Bước 1: Giỏ hàng & Điền thông tin giao/nhận hàng
 * - Bước 2: Bước Thanh Toán Online (VietQR 24/7, MoMo, ZaloPay, Thẻ ATM/Visa)
 * - Bước 3: Biên lai & Hoàn tất đặt hàng
 */

let currentOrderData = null;
let currentPayMethod = 'vietqr';
let currentDeliveryType = 'delivery';

function formatVND(num) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(num || 0);
}

function calculateTotals() {
  const cart = getCart();
  const subtotal = cart.reduce((sum, item) => sum + (item.price * (item.quantity || 1)), 0);
  let shipping = 0;
  if (currentDeliveryType === 'delivery') {
    shipping = subtotal >= 200000 || subtotal === 0 ? 0 : 25000;
  }
  const total = subtotal + shipping;
  return { subtotal, shipping, total };
}

function renderCartItems() {
  const cartContainer = document.getElementById('cart-items-container');
  const emptyState = document.getElementById('cart-empty-state');
  const stepsBar = document.getElementById('checkout-steps-bar');
  const step1 = document.getElementById('cart-step-1');
  const step2 = document.getElementById('cart-step-2');
  const step3 = document.getElementById('cart-step-3');

  const subtotalEl = document.getElementById('cart-subtotal');
  const shippingEl = document.getElementById('cart-shipping');
  const totalEl = document.getElementById('cart-total');

  const cart = getCart();

  if (!cart || cart.length === 0) {
    if (emptyState) emptyState.style.display = 'block';
    if (stepsBar) stepsBar.style.display = 'none';
    if (step1) step1.style.display = 'none';
    if (step2) step2.style.display = 'none';
    if (step3) step3.style.display = 'none';
    if (cartContainer) cartContainer.innerHTML = '';
    return;
  }

  if (emptyState) emptyState.style.display = 'none';
  if (stepsBar) stepsBar.style.display = 'flex';
  if (step1) step1.style.display = 'grid';

  let html = '<div class="cart-items-list">';
  cart.forEach(item => {
    const itemTotal = item.price * (item.quantity || 1);
    const itemKey = item.cartKey || item.id;

    html += `
      <div class="cart-item-row" data-id="${itemKey}">
        <img class="cart-item-img" src="${item.image || '/assets/images/home/bánh sừng và cf sữa.jpg'}" alt="${item.name}">
        <div class="cart-item-info">
          <div class="cart-item-title">${item.name}</div>
          ${item.size ? `<div style="font-size: 0.8rem; color: #444; font-weight: 600;">Size: ${item.size}</div>` : ''}
          ${item.toppings ? `<div style="font-size: 0.8rem; color: #444; font-weight: 500;">Topping: ${item.toppings}</div>` : ''}
          ${item.note ? `<div class="cart-item-note" style="font-size: 0.8rem; color: #666; margin-top: 2px;">Ghi chú: <em>${item.note}</em></div>` : ''}
          <div class="cart-item-price">${formatVND(item.price)}</div>
        </div>
        <div class="cart-qty-ctrl">
          <button class="qty-btn" onclick="changeQty('${itemKey}', -1)" title="Giảm số lượng">-</button>
          <span class="qty-num">${item.quantity || 1}</span>
          <button class="qty-btn" onclick="changeQty('${itemKey}', 1)" title="Tăng số lượng">+</button>
        </div>
        <button class="btn-remove-item" onclick="removeItem('${itemKey}')" title="Xóa món">Xóa</button>
      </div>
    `;
  });
  html += '</div>';

  if (cartContainer) cartContainer.innerHTML = html;

  const { subtotal, shipping, total } = calculateTotals();
  if (subtotalEl) subtotalEl.textContent = formatVND(subtotal);
  if (shippingEl) shippingEl.textContent = shipping === 0 ? 'Miễn phí' : formatVND(shipping);
  if (totalEl) totalEl.textContent = formatVND(total);

  // Điền trước thông tin nếu đã đăng nhập
  const currentUser = typeof getAuthUser === 'function' ? getAuthUser() : null;
  if (currentUser) {
    const nameInput = document.getElementById('cust-name');
    const phoneInput = document.getElementById('cust-phone');
    if (nameInput && !nameInput.value) nameInput.value = currentUser.name || '';
    if (phoneInput && !phoneInput.value) phoneInput.value = currentUser.phone || '';
  }
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
  if (typeof showToast === 'function') {
    showToast('Đã xóa món khỏi giỏ hàng', 'info');
  }
}

function toggleDeliveryType(type) {
  currentDeliveryType = type;
  const addressGroup = document.getElementById('delivery-address-group');
  const radioCards = document.querySelectorAll('.delivery-radio-card');
  radioCards.forEach(rc => {
    const radio = rc.querySelector('input[type="radio"]');
    rc.classList.toggle('active', radio && radio.value === type);
  });

  if (addressGroup) {
    addressGroup.style.display = type === 'pickup' ? 'none' : 'block';
  }

  const { subtotal, shipping, total } = calculateTotals();
  const subtotalEl = document.getElementById('cart-subtotal');
  const shippingEl = document.getElementById('cart-shipping');
  const totalEl = document.getElementById('cart-total');

  if (subtotalEl) subtotalEl.textContent = formatVND(subtotal);
  if (shippingEl) shippingEl.textContent = shipping === 0 ? 'Miễn phí' : formatVND(shipping);
  if (totalEl) totalEl.textContent = formatVND(total);
}

/**
 * CHUYỂN TỚI BƯỚC THANH TOÁN (STEP 2)
 */
function proceedToPayment() {
  const user = typeof getAuthUser === 'function' ? getAuthUser() : null;
  if (!user) {
    if (typeof showToast === 'function') {
      showToast('Vui lòng đăng nhập trước khi tiến hành thanh toán!', 'error');
    }
    setTimeout(() => {
      window.location.href = '/login/?redirect=/cart/';
    }, 1200);
    return;
  }

  const cart = getCart();
  if (!cart || cart.length === 0) {
    showToast('Giỏ hàng của bạn đang trống!', 'error');
    return;
  }

  const nameInput = document.getElementById('cust-name');
  const phoneInput = document.getElementById('cust-phone');
  const addressInput = document.getElementById('cust-address');
  const noteInput = document.getElementById('cust-note');

  const custName = (nameInput ? nameInput.value : '').trim();
  const custPhone = (phoneInput ? phoneInput.value : '').trim();
  const custAddress = (addressInput ? addressInput.value : '').trim();
  const custNote = (noteInput ? noteInput.value : '').trim();

  if (!custName) {
    showToast('Vui lòng nhập họ và tên người nhận!', 'error');
    if (nameInput) nameInput.focus();
    return;
  }

  if (!custPhone || !/^[0-9]{9,11}$/.test(custPhone)) {
    showToast('Vui lòng nhập số điện thoại hợp lệ (10 số)!', 'error');
    if (phoneInput) phoneInput.focus();
    return;
  }

  if (currentDeliveryType === 'delivery' && !custAddress) {
    showToast('Vui lòng nhập địa chỉ giao hàng!', 'error');
    if (addressInput) addressInput.focus();
    return;
  }

  const { subtotal, shipping, total } = calculateTotals();
  const orderCode = 'CN' + Math.floor(1000 + Math.random() * 9000);

  currentOrderData = {
    orderCode,
    custName,
    custPhone,
    custAddress: currentDeliveryType === 'pickup' ? 'Nhận tại quầy bar FOXTAIL' : custAddress,
    deliveryType: currentDeliveryType,
    custNote,
    subtotal,
    shipping,
    total,
    items: [...cart],
    createdAt: new Date()
  };

  // Cập nhật giao diện bước 2
  document.getElementById('cart-step-1').style.display = 'none';
  document.getElementById('cart-step-2').style.display = 'block';
  window.scrollTo({ top: 120, behavior: 'smooth' });

  // Update step indicator
  document.getElementById('step-node-1').classList.remove('active');
  document.getElementById('step-node-1').classList.add('completed');
  document.getElementById('step-node-2').classList.add('active');

  // Fill summary column
  const payOrderCode = document.getElementById('pay-order-code');
  const payCustName = document.getElementById('pay-cust-name');
  const payCustPhone = document.getElementById('pay-cust-phone');
  const payDeliveryLabel = document.getElementById('pay-delivery-label');
  const payFinalTotal = document.getElementById('pay-final-total');

  if (payOrderCode) payOrderCode.textContent = `#${orderCode}`;
  if (payCustName) payCustName.textContent = custName;
  if (payCustPhone) payCustPhone.textContent = custPhone;
  if (payDeliveryLabel) payDeliveryLabel.textContent = currentDeliveryType === 'pickup' ? 'Nhận tại quầy bar' : 'Giao tận nơi';
  if (payFinalTotal) payFinalTotal.textContent = formatVND(total);

  selectPaymentMethod('vietqr');
}

/**
 * QUAY LẠI BƯỚC 1 (SỬA GIỎ HÀNG)
 */
function backToStep1() {
  document.getElementById('cart-step-2').style.display = 'none';
  document.getElementById('cart-step-1').style.display = 'grid';
  window.scrollTo({ top: 120, behavior: 'smooth' });

  document.getElementById('step-node-2').classList.remove('active');
  document.getElementById('step-node-1').classList.remove('completed');
  document.getElementById('step-node-1').classList.add('active');
}

/**
 * CHỌN PHƯƠNG THỨC THANH TOÁN ONLINE
 */
function selectPaymentMethod(method) {
  currentPayMethod = method;

  // Cập nhật highlight active trên danh sách phương thức
  const methodCards = document.querySelectorAll('.pay-method-card');
  methodCards.forEach(card => {
    const radio = card.querySelector('input[type="radio"]');
    const isMatched = radio && radio.value === method;
    card.classList.toggle('active', isMatched);
    if (radio) radio.checked = isMatched;
  });

  const detailsBox = document.getElementById('payment-details-box');
  if (!detailsBox || !currentOrderData) return;

  const totalAmount = currentOrderData.total;
  const transferMsg = `FOXTAIL ${currentOrderData.orderCode}`;

  if (method === 'vietqr') {
    // VietQR Ngân hàng MB Bank 24/7
    const qrUrl = `https://img.vietqr.io/image/MB-0909123456-compact2.png?amount=${totalAmount}&addInfo=${encodeURIComponent(transferMsg)}&accountName=CAO%20NGOT%20COFFEE`;

    detailsBox.innerHTML = `
      <div class="qr-payment-card">
        <div class="qr-col">
          <div class="qr-frame">
            <img src="${qrUrl}" alt="Mã VietQR thanh toán FOXTAIL" onerror="this.src='/assets/images/logo.png'">
            <div class="qr-scan-badge"><i class="fa-solid fa-camera"></i> Quét mã để thanh toán</div>
          </div>
        </div>
        <div class="qr-info-col">
          <h3 class="bank-title">Ngân Hàng Quân Đội (MB Bank)</h3>
          <div class="bank-detail-rows">
            <div class="bank-detail-row">
              <span class="label">Chủ tài khoản:</span>
              <strong class="value">FOXTAIL COFFEE</strong>
            </div>
            <div class="bank-detail-row">
              <span class="label">Số tài khoản:</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <strong class="value highlight-text">0909 123 456</strong>
                <button type="button" class="btn-copy-small" onclick="copyToClipboard('0909123456', 'Số tài khoản')"><i class="fa-regular fa-copy"></i> Sao chép</button>
              </div>
            </div>
            <div class="bank-detail-row">
              <span class="label">Số tiền:</span>
              <strong class="value price-highlight">${formatVND(totalAmount)}</strong>
            </div>
            <div class="bank-detail-row">
              <span class="label">Nội dung chuyển khoản:</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <strong class="value highlight-text">${transferMsg}</strong>
                <button type="button" class="btn-copy-small" onclick="copyToClipboard('${transferMsg}', 'Nội dung chuyển khoản')"><i class="fa-regular fa-copy"></i> Sao chép</button>
              </div>
            </div>
          </div>
          <div class="qr-help-text">
            Mở ứng dụng bất kỳ ngân hàng nào, chọn <strong>Quét mã QR</strong> để thanh toán tức thì với thông tin và số tiền đã được điền sẵn chính xác 100%.
          </div>
        </div>
      </div>
    `;
  } else if (method === 'momo') {
    // MoMo QR
    detailsBox.innerHTML = `
      <div class="qr-payment-card">
        <div class="qr-col">
          <div class="qr-frame" style="border-color: #a50064;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=2|99|0909123456|CAO%20NGOT%20COFFEE||0|0|${totalAmount}|${transferMsg}|transfer_p2p" alt="Mã MoMo QR">
            <div class="qr-scan-badge" style="background: #a50064;"><i class="fa-solid fa-qrcode"></i> Quét bằng Ví MoMo</div>
          </div>
        </div>
        <div class="qr-info-col">
          <h3 class="bank-title" style="color: #a50064;">Cổng Thanh Toán Ví MoMo</h3>
          <div class="bank-detail-rows">
            <div class="bank-detail-row">
              <span class="label">Người nhận:</span>
              <strong class="value">FOXTAIL Cafe (0909 123 456)</strong>
            </div>
            <div class="bank-detail-row">
              <span class="label">Số tiền thanh toán:</span>
              <strong class="value price-highlight">${formatVND(totalAmount)}</strong>
            </div>
            <div class="bank-detail-row">
              <span class="label">Lời nhắn chuyển tiền:</span>
              <div style="display: flex; align-items: center; gap: 8px;">
                <strong class="value highlight-text">${transferMsg}</strong>
                <button type="button" class="btn-copy-small" onclick="copyToClipboard('${transferMsg}', 'Lời nhắn MoMo')"><i class="fa-regular fa-copy"></i> Sao chép</button>
              </div>
            </div>
          </div>
          <div class="qr-help-text">
            Mở ứng dụng <strong>Ví MoMo</strong>, bấm quét mã QR hoặc chuyển tiền đến số điện thoại <strong>0909 123 456</strong> với lời nhắn ở trên.
          </div>
        </div>
      </div>
    `;
  } else if (method === 'zalopay') {
    // ZaloPay QR
    detailsBox.innerHTML = `
      <div class="qr-payment-card">
        <div class="qr-col">
          <div class="qr-frame" style="border-color: #0068ff;">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=zalopay://transfer?phone=0909123456&amount=${totalAmount}&message=${encodeURIComponent(transferMsg)}" alt="Mã ZaloPay QR">
            <div class="qr-scan-badge" style="background: #0068ff;"><i class="fa-solid fa-bolt"></i> Quét bằng Zalo / ZaloPay</div>
          </div>
        </div>
        <div class="qr-info-col">
          <h3 class="bank-title" style="color: #0068ff;">Cổng Thanh Toán Ví ZaloPay</h3>
          <div class="bank-detail-rows">
            <div class="bank-detail-row">
              <span class="label">Tài khoản ZaloPay:</span>
              <strong class="value">0909 123 456 (FOXTAIL Vietnam)</strong>
            </div>
            <div class="bank-detail-row">
              <span class="label">Số tiền thanh toán:</span>
              <strong class="value price-highlight">${formatVND(totalAmount)}</strong>
            </div>
            <div class="bank-detail-row">
              <span class="label">Nội dung:</span>
              <strong class="value highlight-text">${transferMsg}</strong>
            </div>
          </div>
          <div class="qr-help-text">
            Mở Zalo hoặc ZaloPay để quét mã QR và xác thực thanh toán tức thì.
          </div>
        </div>
      </div>
    `;
  } else if (method === 'card') {
    // Thẻ ngân hàng / Thẻ quốc tế
    detailsBox.innerHTML = `
      <div class="card-gateway-box">
        <div class="card-brands-row">
          <span class="card-brand-badge"><i class="fa-brands fa-cc-visa"></i> VISA</span>
          <span class="card-brand-badge"><i class="fa-brands fa-cc-mastercard"></i> MasterCard</span>
          <span class="card-brand-badge"><i class="fa-brands fa-cc-jcb"></i> JCB</span>
          <span class="card-brand-badge"><i class="fa-solid fa-credit-card"></i> ATM Nội Địa (Napas)</span>
        </div>
        <p style="font-size: 0.95rem; color: #333; line-height: 1.6; margin-bottom: 1rem;">
          Đơn hàng sẽ được chuyển hướng an toàn tới Cổng thanh toán quốc tế VNPAY / OnePay có hỗ trợ 3D-Secure và xác thực OTP bảo mật từ ngân hàng phát hành thẻ của bạn.
        </p>
        <div class="card-mock-form">
          <div class="form-group">
            <label class="form-label">Số thẻ ngân hàng:</label>
            <input type="text" class="form-control" placeholder="Số thẻ" maxlength="19">
          </div>
          <div class="form-row-2" style="margin-top: 0.75rem;">
            <div class="form-group">
              <label class="form-label">Hết hạn (MM/YY):</label>
              <input type="text" class="form-control" placeholder="MM/YY" maxlength="5">
            </div>
            <div class="form-group">
              <label class="form-label">Mã CVV/CVC:</label>
              <input type="password" class="form-control" placeholder="CVV" maxlength="4">
            </div>
          </div>
        </div>
      </div>
    `;
  }
}

function copyToClipboard(text, fieldName) {
  navigator.clipboard.writeText(text).then(() => {
    if (typeof showToast === 'function') {
      showToast(`Đã sao chép ${fieldName}: ${text}`, 'success');
    }
  }).catch(() => {
    if (typeof showToast === 'function') {
      showToast(`Đã chọn ${text}`, 'info');
    }
  });
}

/**
 * XÁC NHẬN ĐÃ THANH TOÁN ONLINE THÀNH CÔNG (STEP 3)
 */
function confirmOnlinePayment() {
  const btn = document.getElementById('btn-confirm-payment');
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Đang xác thực giao dịch trực tuyến...';
  }

  setTimeout(() => {
    // Xóa giỏ hàng sau khi thanh toán online thành công
    localStorage.removeItem('cf_cart');
    if (typeof updateCartBadge === 'function') {
      updateCartBadge();
    }

    // Chuyển sang Bước 3
    document.getElementById('cart-step-2').style.display = 'none';
    document.getElementById('cart-step-3').style.display = 'block';
    window.scrollTo({ top: 100, behavior: 'smooth' });

    // Cập nhật Step Indicator
    document.getElementById('step-node-2').classList.remove('active');
    document.getElementById('step-node-2').classList.add('completed');
    document.getElementById('step-node-3').classList.add('active');

    // Fill biên lai
    if (currentOrderData) {
      const orderIdEl = document.getElementById('receipt-order-id');
      const timeEl = document.getElementById('receipt-order-time');
      const nameEl = document.getElementById('receipt-cust-name');
      const methodEl = document.getElementById('receipt-pay-method');
      const totalEl = document.getElementById('receipt-total');

      if (orderIdEl) orderIdEl.textContent = `#${currentOrderData.orderCode}`;
      if (timeEl) {
        const d = currentOrderData.createdAt || new Date();
        timeEl.textContent = d.toLocaleDateString('vi-VN') + ' ' + d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
      }
      if (nameEl) nameEl.textContent = `${currentOrderData.custName} (${currentOrderData.custPhone})`;
      if (methodEl) {
        const methodNames = {
          vietqr: 'Chuyển khoản VietQR 24/7',
          momo: 'Ví điện tử MoMo',
          zalopay: 'Ví điện tử ZaloPay',
          card: 'Thẻ Ngân Hàng / Quốc Tế (Online Gateway)'
        };
        methodEl.textContent = methodNames[currentPayMethod] || 'Thanh toán trực tuyến';
      }
      if (totalEl) totalEl.textContent = formatVND(currentOrderData.total);
    }

    if (typeof showToast === 'function') {
      showToast('Thanh toán trực tuyến thành công! Đơn hàng đã được tiếp nhận.', 'success', 4000);
    }
  }, 1400);
}

document.addEventListener('DOMContentLoaded', () => {
  renderCartItems();
});
