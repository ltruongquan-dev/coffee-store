/**
 * CF STORE - LOGIN PAGE SCRIPT
 * Authenticates user via Phone and Password with MongoDB backend
 */

document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('login-form');
  const phoneInput = document.getElementById('login-phone');
  const passwordInput = document.getElementById('login-password');
  const submitBtn = document.getElementById('btn-submit-login');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const phone = phoneInput.value.trim();
    const password = passwordInput.value;

    if (!phone) {
      showToast('Vui lòng nhập số điện thoại', 'error');
      phoneInput.focus();
      return;
    }

    if (!password) {
      showToast('Vui lòng nhập mật khẩu', 'error');
      passwordInput.focus();
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = 'Đang kiểm tra MongoDB... ⏳';

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone, password })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Đăng nhập không thành công');
      }

      // Save token and user data
      localStorage.setItem('cf_token', data.token);
      localStorage.setItem('cf_user', JSON.stringify(data.user));

      showToast(`☕ Chào mừng trở lại, ${data.user.name}!`, 'success');

      // Check redirect param
      const urlParams = new URLSearchParams(window.location.search);
      const redirectUrl = urlParams.get('redirect') || '/home/';

      setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1200);

    } catch (err) {
      showToast(err.message, 'error');
      submitBtn.disabled = false;
      submitBtn.innerHTML = 'Đăng Nhập Ngay ☕';
    }
  });
});
