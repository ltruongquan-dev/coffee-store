// ========================================
// FOXTAIL COFFEE - LỊCH SỬ ĐƠN HÀNG
// ========================================

let currentPage = 1;
let currentLimit = 10;
let totalPages = 1;

// Các trạng thái đơn hàng
const STATUS_LABELS = {
  pending: 'Chờ xác nhận',
  confirmed: 'Đã xác nhận',
  preparing: 'Đang chuẩn bị',
  delivering: 'Đang giao hàng',
  completed: 'Đã hoàn thành',
  cancelled: 'Đã hủy'
};

// Trạng thái thanh toán
const PAYMENT_LABELS = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thanh toán thất bại',
  refunded: 'Đã hoàn tiền'
};

// ========================================
// 1. LẤY TOKEN ĐĂNG NHẬP
// ========================================

function getOrdersToken() {
  return localStorage.getItem('cf_token');
}

// ========================================
// 2. ĐỊNH DẠNG TIỀN VIỆT NAM
// ========================================

function formatOrderMoney(amount) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND'
  }).format(Number(amount) || 0);
}

// ========================================
// 3. ĐỊNH DẠNG NGÀY GIỜ
// ========================================

function formatOrderDate(date) {
  if (!date) return 'Chưa có thông tin';

  const d = new Date(date);

  if (Number.isNaN(d.getTime())) {
    return 'Chưa có thông tin';
  }

  return d.toLocaleString('vi-VN');
}

// ========================================
// 4. LÀM SẠCH HTML
// ========================================

function escapeOrderHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[char]);
}

// ========================================
// 5. HIỂN THỊ ĐIỂM THÀNH VIÊN
// ========================================

async function loadLoyaltyPoints(token) {
  const pointsElement =
    document.getElementById('loyalty-points');

  try {
    const response = await fetch('/api/auth/me', {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || 'Không lấy được điểm');
    }

    const points = Number(
      result.user.loyaltyPoints || 0
    );

    pointsElement.textContent =
      points.toLocaleString('vi-VN');

  } catch (error) {
    console.error('Lỗi tải điểm thành viên:', error);
    pointsElement.textContent = 'Chưa tải được';
  }
}

// ========================================
// 6. HIỂN THỊ SẢN PHẨM TRONG ĐƠN
// ========================================

function renderOrderItems(items) {
  if (!Array.isArray(items) || items.length === 0) {
    return '<p>Đơn hàng chưa có sản phẩm.</p>';
  }

  return items.map(item => {
    const name = escapeOrderHTML(item.name);
    const size = escapeOrderHTML(item.size || '');
    const quantity = Number(item.quantity) || 1;
    const price = formatOrderMoney(item.price);

    const image = item.image
      ? escapeOrderHTML(item.image)
      : '/assets/images/drink_specialty.jpg';

    return `
      <div class="order-item">

        <img
          src="${image}"
          alt="${name}"
          onerror="this.style.display='none'"
        >

        <div class="order-item-info">

          <h4>${name}</h4>

          <p>
            ${size ? `Size: ${size} · ` : ''}
            Số lượng: ${quantity}
          </p>

        </div>

        <strong>${price}</strong>

      </div>
    `;
  }).join('');
}

// ========================================
// 7. HIỂN THỊ LỊCH SỬ THAY ĐỔI TRẠNG THÁI
// ========================================

function renderOrderTimeline(history) {
  if (!Array.isArray(history) || history.length === 0) {
    return '<p>Chưa có lịch sử trạng thái.</p>';
  }

  return history.map(item => {
    const status = item.status || 'pending';

    const label =
      STATUS_LABELS[status] || status;

    const note = escapeOrderHTML(item.note || '');

    return `
      <div class="timeline-item">

        <strong>${escapeOrderHTML(label)}</strong>

        <span>${formatOrderDate(item.changedAt)}</span>

        ${note ? `<p>${note}</p>` : ''}

      </div>
    `;
  }).join('');
}

// ========================================
// 8. TẠO THẺ ĐƠN HÀNG
// ========================================

function renderOrderCard(order) {
  const status = order.orderStatus || order.status || 'pending';

  const statusLabel =
    STATUS_LABELS[status] || status;

  const paymentLabel =
    PAYMENT_LABELS[order.paymentStatus] ||
    'Chưa xác định';

  const orderCode =
    order.orderCode || order.orderNumber || 'Chưa có mã';

  const items = renderOrderItems(order.items);

  const history =
    renderOrderTimeline(order.statusHistory);

  return `
    <article class="order-card">

      <div class="order-card-header">

        <div>
          <div class="order-code">
            Mã đơn: #${escapeOrderHTML(orderCode)}
          </div>

          <div class="order-date">
            Đặt ngày: ${formatOrderDate(order.createdAt)}
          </div>
        </div>

        <span class="order-status status-${escapeOrderHTML(status)}">
          ${escapeOrderHTML(statusLabel)}
        </span>

      </div>

      <div class="order-items">
        ${items}
      </div>

      <div class="order-total">
        <span>Tổng tiền đơn hàng</span>

        <strong>
          ${formatOrderMoney(order.totalAmount)}
        </strong>
      </div>

      <p>
        <strong>Thanh toán:</strong>
        ${escapeOrderHTML(paymentLabel)}
      </p>

      <p>
        <strong>Hình thức nhận:</strong>
        ${order.deliveryType === 'pickup'
          ? 'Nhận tại cửa hàng'
          : 'Giao hàng'}
      </p>

      <details class="order-timeline">

        <summary>Lịch sử trạng thái đơn hàng</summary>

        <div>
          ${history}
        </div>

      </details>

    </article>
  `;
}

// ========================================
// 9. TẢI DANH SÁCH ĐƠN HÀNG TỪ BACKEND
// ========================================

async function loadOrders() {
  const token = getOrdersToken();

  const loading =
    document.getElementById('orders-loading');

  const errorElement =
    document.getElementById('orders-error');

  const emptyElement =
    document.getElementById('orders-empty');

  const listElement =
    document.getElementById('orders-list');

  const paginationElement =
    document.getElementById('orders-pagination');

  loading.hidden = false;
  errorElement.hidden = true;
  emptyElement.hidden = true;
  paginationElement.hidden = true;

  listElement.innerHTML = '';

  if (!token) {
    loading.hidden = true;
    errorElement.textContent =
      'Bạn chưa đăng nhập. Vui lòng đăng nhập để xem đơn hàng.';
    errorElement.hidden = false;
    return;
  }

  try {
    const status =
      document.getElementById('order-status-filter').value;

    const params = new URLSearchParams({
      page: currentPage,
      limit: currentLimit
    });

    if (status) {
      params.append('status', status);
    }

    const response = await fetch(
      `/api/orders/my?${params.toString()}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || 'Không thể tải lịch sử đơn hàng'
      );
    }

    const orders = result.data || [];

    loading.hidden = true;

    if (orders.length === 0) {
      emptyElement.hidden = false;
      return;
    }

    listElement.innerHTML = orders
      .map(renderOrderCard)
      .join('');

    const pagination = result.pagination || {};

    currentPage = pagination.page || 1;
    totalPages = pagination.totalPages || 1;

    if (totalPages > 1) {
      paginationElement.hidden = false;

      document.getElementById('current-page').textContent =
        `Trang ${currentPage} / ${totalPages}`;

      document.getElementById('btn-prev-page').disabled =
        currentPage <= 1;

      document.getElementById('btn-next-page').disabled =
        currentPage >= totalPages;
    }

  } catch (error) {
    loading.hidden = true;
    errorElement.hidden = false;
    errorElement.textContent = error.message;

    console.error('Lỗi tải đơn hàng:', error);
  }
}

// ========================================
// 10. GẮN SỰ KIỆN CHO GIAO DIỆN
// ========================================

document.addEventListener('DOMContentLoaded', async () => {

  const token = getOrdersToken();

  if (token) {
    loadLoyaltyPoints(token);
  }

  // Tải lịch sử đơn hàng
  loadOrders();

  // Lọc theo trạng thái
  document
    .getElementById('order-status-filter')
    .addEventListener('change', () => {

      currentPage = 1;
      loadOrders();

    });

  // Làm mới danh sách
  document
    .getElementById('btn-refresh-orders')
    .addEventListener('click', () => {

      loadOrders();

      if (token) {
        loadLoyaltyPoints(token);
      }

    });

  // Trang trước
  document
    .getElementById('btn-prev-page')
    .addEventListener('click', () => {

      if (currentPage > 1) {
        currentPage--;
        loadOrders();
      }

    });

  // Trang tiếp theo
  document
    .getElementById('btn-next-page')
    .addEventListener('click', () => {

      if (currentPage < totalPages) {
        currentPage++;
        loadOrders();
      }

    });

});