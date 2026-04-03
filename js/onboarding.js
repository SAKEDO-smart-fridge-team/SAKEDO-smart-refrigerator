// js/onboarding.js

function showStep(stepNumber) {
  document.getElementById('step-1').style.display = 'none';
  document.getElementById('step-2').style.display = 'none';
  document.getElementById('step-3').style.display = 'none';
  document.getElementById('step-4').style.display = 'none';
  document.getElementById('step-5').style.display = 'none';
  
  document.getElementById('step-' + stepNumber).style.display = 'flex';
}

document.addEventListener('DOMContentLoaded', () => {
  // Logic chọn chế độ ăn kiêng (Chỉ chọn 1)
  const dietButtons = document.querySelectorAll('.diet-btn');
  dietButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      dietButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
    });
  });

  // Logic chọn thực phẩm dị ứng / không thích (Chọn nhiều)
  const tagButtons = document.querySelectorAll('.tag-btn');
  tagButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      btn.classList.toggle('active');
    });
  });
});
