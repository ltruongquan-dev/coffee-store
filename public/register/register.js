/**
 * CF STORE - REGISTER PAGE SCRIPT
 * Đăng ký tài khoản trực tiếp (Họ tên, SĐT, Mật khẩu) lưu vào MongoDB
 * Đã bỏ phần xác nhận SMS / SSM theo yêu cầu.
 */

document.addEventListener('DOMContentLoaded', () => {
  const registerForm = document.getElementById('register-form');
  const regPhone = document.getElementById('reg-phone');
  const regName = document.getElementById('reg-name');
  const regPassword = document.getElementById('reg-password');
  const regConfirmPassword = document.getElementById('reg-confirm-password');
  const btnSubmitRegister = document.getElementById('btn-submit-register');

  if (!registerForm) return;

  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const phone = regPhone.value.trim();
    const name = regName.value.trim();
    const password = regPassword.value;
    const confirmPassword = regConfirmPassword.value;

    const vnPhoneRegex = /^(0[3|5|7|8|9])[0-9]{8}$/;
    if (!phone || !vnPhoneRegex.test(phone)) {
      showToast('Số điện thoại không hợp lệ (10 số, bắt đầu bằng 03, 05, 07, 08, 09)', 'error');
      regPhone.focus();
      return;
    }

    if (!name || name.length < 2) {
      showToast('Vui lòng nhập họ và tên (ít nhất 2 ký tự)', 'error');
      regName.focus();
      return;
    }

    if (!password || password.length < 6) {
      showToast('Mật khẩu phải từ 6 ký tự trở lên', 'error');
      regPassword.focus();
      return;
    }

    if (password !== confirmPassword) {
      showToast('Mật khẩu và xác nhận mật khẩu không khớp!', 'error');
      regConfirmPassword.focus();
      return;
    }

    btnSubmitRegister.disabled = true;
    btnSubmitRegister.innerHTML = 'Đang xử lý đăng ký...';

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone,
          name,
          password,
          confirmPassword
        })
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.message || 'Đăng ký không thành công');
      }

      // Lưu token và user vào localStorage
      localStorage.setItem('cf_token', data.token);
      localStorage.setItem('cf_user', JSON.stringify(data.user));

      showToast('Đăng ký tài khoản thành công! Đang chuyển hướng...', 'success');

      setTimeout(() => {
        window.location.href = '/home/';
      }, 1200);

    } catch (err) {
      showToast(err.message, 'error');
      btnSubmitRegister.disabled = false;
      btnSubmitRegister.innerHTML = 'Đăng Ký Tài Khoản';
    }
  });
});
