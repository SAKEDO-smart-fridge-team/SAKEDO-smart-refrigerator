(function () {
  // ===== DELETE MODAL =====
  const modal = document.getElementById('delete-modal');
  const modalCancel = document.getElementById('modal-cancel');
  const modalConfirm = document.getElementById('modal-confirm');
  let itemToDelete = null;

  // Show modal when clicking delete button
  document.querySelectorAll('.btn-delete-item').forEach(btn => {
    btn.addEventListener('click', () => {
      itemToDelete = btn.closest('.result-item');
      modal.classList.add('active');
    });
  });

  // Cancel – close modal
  modalCancel.addEventListener('click', () => {
    modal.classList.remove('active');
    itemToDelete = null;
  });

  // Confirm – delete item with animation
  modalConfirm.addEventListener('click', () => {
    if (itemToDelete) {
      const item = itemToDelete;

      // Ghi nhớ chiều cao thực tế trước khi animation
      const itemHeight = item.offsetHeight;
      item.style.height = itemHeight + 'px';
      item.style.overflow = 'hidden';

      // Phase 1: Fade out + trượt sang phải (0.25s)
      item.style.transition = 'opacity 0.25s ease, transform 0.25s ease';
      item.style.opacity = '0';
      item.style.transform = 'translateX(40px)';

      // Phase 2: Thu gọn chiều cao → các item dồn lên (0.3s)
      setTimeout(() => {
        item.style.transition = 'height 0.3s ease, padding 0.3s ease, margin 0.3s ease, border 0.3s ease';
        item.style.height = '0';
        item.style.padding = '0 10px';
        item.style.marginBottom = '0';
        item.style.borderBottomWidth = '0';

        // Xóa hẳn khỏi DOM sau khi animation xong
        setTimeout(() => item.remove(), 300);
      }, 250);
    }
    modal.classList.remove('active');
    itemToDelete = null;
  });

  // Close modal when clicking overlay background
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      modal.classList.remove('active');
      itemToDelete = null;
    }
  });


  // ===== EDIT MODAL (Bottom Sheet) =====
  const editModal = document.getElementById('edit-modal');
  const editClose = document.getElementById('edit-close');
  const editCancel = document.getElementById('edit-cancel');
  const editSave = document.getElementById('edit-save');
  const editName = document.getElementById('edit-name');
  const editQty = document.getElementById('edit-qty');
  const editUnit = document.getElementById('edit-unit');
  const editExpiry = document.getElementById('edit-expiry');
  const editNote = document.getElementById('edit-note');

  // Category elements
  const editCategoryBox = document.getElementById('edit-category-box');
  const editCategoryDropdown = document.getElementById('edit-category-dropdown');
  const editCategoryIcon = document.getElementById('edit-category-icon');
  const editCategoryText = document.getElementById('edit-category-text');

  // Location elements
  const editLocationBox = document.getElementById('edit-location-box');
  const editLocationDropdown = document.getElementById('edit-location-dropdown');
  const editLocationIcon = document.getElementById('edit-location-icon');
  const editLocationText = document.getElementById('edit-location-text');

  let itemToEdit = null;

  // --- Open edit modal ---
  document.querySelectorAll('.btn-edit-item').forEach(btn => {
    btn.addEventListener('click', () => {
      itemToEdit = btn.closest('.result-item');
      const name = itemToEdit.dataset.name || '';

      // Pre-fill fields
      editName.value = name;
      editQty.value = '1';
      editUnit.value = 'kg';
      editNote.value = '';

      // Set default date to today
      const today = new Date();
      const yyyy = today.getFullYear();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      editExpiry.value = `${yyyy}-${mm}-${dd}`;

      // Reset category & location
      editCategoryIcon.src = '';
      editCategoryIcon.style.display = 'none';
      editCategoryText.textContent = 'Chọn danh mục';
      editLocationIcon.src = '';
      editLocationIcon.style.display = 'none';
      editLocationText.textContent = 'Chọn vị trí';

      // Close any open dropdowns
      editCategoryDropdown.classList.remove('open');
      editLocationDropdown.classList.remove('open');

      // Show modal
      editModal.classList.add('active');
    });
  });

  // --- Close edit modal ---
  function closeEditModal() {
    editModal.classList.remove('active');
    editCategoryDropdown.classList.remove('open');
    editLocationDropdown.classList.remove('open');
    itemToEdit = null;
  }

  editClose.addEventListener('click', closeEditModal);
  editCancel.addEventListener('click', closeEditModal);

  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeEditModal();
  });

  // --- Category dropdown toggle ---
  editCategoryBox.addEventListener('click', () => {
    editCategoryDropdown.classList.toggle('open');
    editLocationDropdown.classList.remove('open');
  });

  // --- Category selection ---
  editCategoryDropdown.querySelectorAll('.edit-dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      const iconSrc = item.dataset.icon;
      const text = item.textContent.trim();

      editCategoryIcon.src = iconSrc;
      editCategoryIcon.style.display = 'block';
      editCategoryText.textContent = text;
      editCategoryDropdown.classList.remove('open');
    });
  });

  // --- Location dropdown toggle ---
  editLocationBox.addEventListener('click', () => {
    editLocationDropdown.classList.toggle('open');
    editCategoryDropdown.classList.remove('open');
  });

  // --- Location selection ---
  editLocationDropdown.querySelectorAll('.edit-dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      const iconSrc = item.dataset.icon;
      const text = item.textContent.trim();

      editLocationIcon.src = iconSrc;
      editLocationIcon.style.display = 'block';
      editLocationText.textContent = text;
      editLocationDropdown.classList.remove('open');
    });
  });

  // --- Save changes ---
  editSave.addEventListener('click', () => {
    if (itemToEdit) {
      const newName = editName.value.trim();

      if (newName) {
        // Update item name in the list
        const nameEl = itemToEdit.querySelector('.result-name');
        if (nameEl) nameEl.textContent = newName;

        // Update data-name attribute
        itemToEdit.dataset.name = newName;
      }
    }
    closeEditModal();
  });


  // ===== COMPLETE BUTTON =====
  const btnComplete = document.getElementById('btn-complete');
  if (btnComplete) {
    btnComplete.addEventListener('click', () => {
      const checkedItems = document.querySelectorAll('.result-item');
      const items = [];
      checkedItems.forEach(item => {
        const checkbox = item.querySelector('input[type="checkbox"]');
        if (checkbox && checkbox.checked) {
          items.push({
            name: item.dataset.name,
            addedAt: new Date().toISOString()
          });
        }
      });

      // Save to localStorage
      const existing = JSON.parse(localStorage.getItem('sakedo_items') || '[]');
      existing.push(...items);
      localStorage.setItem('sakedo_items', JSON.stringify(existing));

      alert('Đã lưu ' + items.length + ' món thành công! 🎉');
      navigate('home', document.querySelector('.nav-item'));
    });
  }
})();
