/**
 * CF STORE - COFFEE PAGE SCRIPT
 */

document.addEventListener('DOMContentLoaded', () => {
  const buyBeanBtns = document.querySelectorAll('.btn-buy-bean');
  buyBeanBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-id');
      const name = btn.getAttribute('data-name');
      const price = parseInt(btn.getAttribute('data-price') || '160000', 10);
      const img = btn.getAttribute('data-img') || '/assets/images/coffee_beans_roast.jpg';

      addToCart({
        id,
        name: `Hạt Cà Phê Mộc: ${name} (250g)`,
        price,
        image: img
      });
    });
  });
});
