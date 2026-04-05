(function () {
  const itemNameInput = document.getElementById('item-name');
  const locationBtns = document.querySelectorAll('.location-btn');
  const categoryBtns = document.querySelectorAll('.category-btn');
  const btnDone = document.getElementById('btn-add-item');

  // --- Helpers ---
  function isLocationSelected() {
    return document.querySelector('.location-btn.active') !== null;
  }
  function isCategorySelected() {
    return document.querySelector('.category-btn.active') !== null;
  }
  function isNameFilled() {
    return itemNameInput && itemNameInput.value.trim().length > 0;
  }

  // --- Update button state ---
  function updateBtnState() {
    if (isNameFilled() && isLocationSelected() && isCategorySelected()) {
      btnDone.classList.remove('disabled');
    } else {
      btnDone.classList.add('disabled');
    }
  }

  // --- Clear error on a field group ---
  function clearError(groupEl) {
    if (groupEl) groupEl.classList.remove('field-error');
    const msg = groupEl && groupEl.querySelector('.validation-msg');
    if (msg) msg.classList.remove('show');
  }

  // --- Toggle location buttons ---
  locationBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      locationBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      clearError(btn.closest('.form-group'));
      updateBtnState();
    });
  });

  // --- Toggle category buttons (chỉ chọn 1) ---
  categoryBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      categoryBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      clearError(btn.closest('.form-group'));
      updateBtnState();
    });
  });

  // --- Listen for name input ---
  if (itemNameInput) {
    itemNameInput.addEventListener('input', () => {
      clearError(itemNameInput.closest('.form-group'));
      updateBtnState();
    });
  }

  // --- Set default date to today ---
  const dateInput = document.getElementById('item-expiry');
  if (dateInput) {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    dateInput.value = `${yyyy}-${mm}-${dd}`;
  }

  // --- Initial state: disabled ---
  if (btnDone) {
    btnDone.classList.add('disabled');
  }

  // --- Done button with validation ---
  if (btnDone) {
    btnDone.addEventListener('click', (e) => {
      let valid = true;

      // Validate tên món
      if (!isNameFilled()) {
        const grp = itemNameInput.closest('.form-group');
        grp.classList.add('field-error');
        valid = false;
      }

      // Validate vị trí
      if (!isLocationSelected()) {
        const grp = document.querySelector('.location-options').closest('.form-group');
        grp.classList.add('field-error');
        valid = false;
      }

      // Validate danh mục
      if (!isCategorySelected()) {
        const grp = document.querySelector('.category-options').closest('.form-group');
        grp.classList.add('field-error');
        valid = false;
      }

      if (!valid) {
        e.stopPropagation();
        return;
      }

      navigate('scan-result', document.querySelector('.camera-btn'));
    });

    // Allow clicking even when "disabled" so we can show errors
    btnDone.style.pointerEvents = 'auto';
  }
})();
