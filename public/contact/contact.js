/**
 * CF STORE - CONTACT PAGE SCRIPT
 */

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('contact-form');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      showToast('Cảm ơn bạn! CF Store đã nhận được thông tin liên hệ và sẽ phản hồi sớm nhất.', 'success');
      form.reset();
    });
  }
});
