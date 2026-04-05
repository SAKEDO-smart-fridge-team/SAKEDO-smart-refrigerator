// ==========================================
// LOGIC CHO TRANG PROFILE (MODALS & FAQ)
// Sử dụng Event Delegation để không bị lỗi khi chuyển trang
// ==========================================

// Hàm hiển thị Toast Notification
window.showToast = function (message, type = "success") {
  const toastContainer = document.getElementById("toast-container");
  if (!toastContainer) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type === "error" ? "toast-danger" : ""}`;

  const icon =
    type === "error"
      ? '<i class="fa-solid fa-circle-exclamation"></i>'
      : '<i class="fa-solid fa-circle-check"></i>';

  toast.innerHTML = `${icon} <span>${message}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("toast-fadeout");
    setTimeout(() => {
      toast.remove();
    }, 400); // 0.4s animation
  }, 2500); // Hiển thị 2.5s
};

document.addEventListener("click", function (e) {
  // 1. Chỉnh sửa thông tin cá nhân
  const editBtn = e.target.closest(".edit-btn");
  if (editBtn) {
    const profileContainer = document.querySelector(".profile-container");
    const inputs = document.querySelectorAll(".profile-card.basic-info input");
    const isEditing = profileContainer.classList.contains("editing");

    if (!isEditing) {
      // Bật chế độ chỉnh sửa
      profileContainer.classList.add("editing");
      editBtn.classList.add("editing-mode");
      editBtn.innerHTML = '<i class="fa-solid fa-floppy-disk"></i> Lưu';
      inputs.forEach((input) => input.removeAttribute("readonly"));
      inputs[0].focus();
    } else {
      // Lưu lại
      const nameInput = document.getElementById("profile-name");
      const newName = nameInput ? nameInput.value.trim() : "";

      if (window.sakedoApi) {
        const auth = window.sakedoApi.getStoredAuth();
        if (auth && auth.user) {
          auth.user.full_name = newName;
          window.sakedoApi.saveAuth(auth);
          // Gửi event để Topbar cập nhật ngay lập tức
          document.dispatchEvent(new CustomEvent("userUpdated", { detail: { full_name: newName } }));
        }
      }

      profileContainer.classList.remove("editing");
      editBtn.classList.remove("editing-mode");
      editBtn.innerHTML = '<i class="fa-solid fa-pen"></i> Chỉnh sửa';
      inputs.forEach((input) => input.setAttribute("readonly", true));
      showToast("Đã lưu thông tin cá nhân");
    }
  }

  // 1.1 Click vào Avatar để đổi ảnh (chỉ khi đang editing)
  const avatarContainer = e.target.closest("#avatar-container");
  if (avatarContainer) {
    const profileContainer = document.querySelector(".profile-container");
    if (profileContainer && profileContainer.classList.contains("editing")) {
      const avatarInput = document.getElementById("avatar-input");
      if (avatarInput) avatarInput.click();
    }
  }

  // 2. Mở Modal Ngôn Ngữ
  if (e.target.closest("#btn-lang")) {
    const langModal = document.getElementById("langModal");
    if (langModal) langModal.classList.add("show");
  }

  // 3. Mở Modal Hỗ Trợ
  if (e.target.closest("#btn-support")) {
    const supportModal = document.getElementById("supportModal");
    if (supportModal) supportModal.classList.add("show");
  }

  // 3.5 Mở Modal Cài đặt sở thích
  if (e.target.closest("#btn-preferences")) {
    const prefsModal = document.getElementById("preferencesModal");
    if (prefsModal) prefsModal.classList.add("show");
  }

  // 4. Mở Modal Xóa Tài Khoản
  if (e.target.closest("#btn-delete-account")) {
    const deleteModal = document.getElementById("deleteModal");
    if (deleteModal) deleteModal.classList.add("show");
  }

  // 5. Đóng Modal khi bấm X hoặc bấm ra ngoài nền mờ
  if (
    e.target.closest(".close-modal") ||
    e.target.closest(".close-modal-btn") ||
    e.target.classList.contains("modal-overlay")
  ) {
    document.querySelectorAll(".modal-overlay").forEach((modal) => {
      modal.classList.remove("show");
    });
  }

  // 5.1 Xác nhận Xóa Tài Khoản
  if (e.target.closest("#confirm-delete-btn")) {
    document.getElementById("deleteModal").classList.remove("show");
    showToast("Đang xử lý yêu cầu xóa tài khoản...", "error");
    setTimeout(() => {
      if (window.sakedoApi) window.sakedoApi.clearAuth();
      window.location.href = 'login.html';
    }, 1500);
  }

  // 6. Chọn Ngôn ngữ (Đổi màu xanh ngọc #3b6b7e và text ngoài màn hình)
  const langItem = e.target.closest(".lang-item");
  if (langItem) {
    document.querySelectorAll(".lang-item").forEach((item) => {
      item.classList.remove("active");
      item.querySelector(".check-icon").style.display = "none";
    });
    langItem.classList.add("active");
    langItem.querySelector(".check-icon").style.display = "inline-block";

    // Cập nhật text ngoài màn hình
    const langText = langItem.innerText.trim();
    const btnLangText = document.querySelector("#btn-lang .val-text");
    if (btnLangText) {
      btnLangText.innerHTML = `<span data-i18n="profile-lang-val">${langText}</span> <i class="fa-solid fa-chevron-right arrow"></i>`;
    }

    // Thực hiện đổi ngôn ngữ hệ thống
    if (window.sakedoI18n) {
      const isEnglish = langText.toLowerCase().includes("anh") || langText.toLowerCase().includes("english");
      window.sakedoI18n.setLanguage(isEnglish ? "en" : "vi");
    }

    // Đóng Modal tự động sau 0.4 giây
    setTimeout(() => {
      const langModal = document.getElementById("langModal");
      if (langModal) langModal.classList.remove("show");
    }, 400);

    const successMsg = window.sakedoI18n ? (window.sakedoI18n.getLanguage() === "vi" ? "Đã đổi ngôn ngữ" : "Language changed") : "Đã đổi ngôn ngữ";
    showToast(successMsg);
  }

  // 6.5 Chọn Sở thích
  const prefItem = e.target.closest(".pref-item");
  if (prefItem) {
    document.querySelectorAll(".pref-item").forEach((item) => {
      item.classList.remove("active");
      item.querySelector(".check-icon").style.display = "none";
    });
    prefItem.classList.add("active");
    prefItem.querySelector(".check-icon").style.display = "inline-block";

    // Đóng Modal tự động sau 0.4 giây
    setTimeout(() => {
      const prefsModal = document.getElementById("preferencesModal");
      if (prefsModal) prefsModal.classList.remove("show");
    }, 400);

    showToast("Đã cập nhật sở thích");
  }

  // 7. Accordion (Mở/Đóng Câu hỏi thường gặp)
  const faqHeader = e.target.closest(".faq-header");
  if (faqHeader) {
    const faqItem = faqHeader.parentElement;
    if (faqItem.classList.contains("active")) {
      faqItem.classList.remove("active");
    } else {
      document
        .querySelectorAll(".faq-item")
        .forEach((item) => item.classList.remove("active"));
      faqItem.classList.add("active");
    }
  }
});

// Sự kiện đổi ảnh (change event không bubble theo click, nên dùng change)
document.addEventListener("change", function (e) {
  // Bật/tắt các công tắc cài đặt
  if (e.target.closest(".switch input[type='checkbox']")) {
    showToast("Đã lưu cài đặt mới");
  }

  // Đổi avatar preview
  if (e.target.id === "avatar-input") {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = function (event) {
        const avatarImg = document.getElementById("profile-avatar");
        if (avatarImg) avatarImg.src = event.target.result;
        showToast("Đã thay đổi ảnh đại diện");
      };
      reader.readAsDataURL(file);
    }
  }
});

// Load user data on profile load
function loadUserProfile() {
  if (window.sakedoApi) {
    const auth = window.sakedoApi.getStoredAuth();
    if (auth && auth.user) {
      const nameInput = document.getElementById("profile-name");
      const emailInput = document.getElementById("profile-email");
      const avatarImg = document.getElementById("profile-avatar");
      const avatarPlaceholder = document.getElementById("avatar-placeholder");

      const emailPrefix = (auth.user?.email || "").split("@")[0] || "U";
      const displayName = auth.user.full_name || auth.user.name || emailPrefix || "Khách hàng";

      if (nameInput) nameInput.value = displayName;
      if (emailInput) emailInput.value = auth.user.email || "";

      // Avatar logic
      if (auth.user.avatar_url) {
        if (avatarImg) {
          avatarImg.src = auth.user.avatar_url;
          avatarImg.style.display = "block";
        }
        if (avatarPlaceholder) avatarPlaceholder.style.display = "none";
      } else {
        if (avatarImg) avatarImg.style.display = "none";
        if (avatarPlaceholder) {
          avatarPlaceholder.style.display = "flex";
          avatarPlaceholder.textContent = (auth.user.full_name || emailPrefix).charAt(0).toUpperCase();
        }
      }
    }

    // Sync Language UI in Profile
    if (window.sakedoI18n) {
      const currentLang = window.sakedoI18n.getLanguage();
      const langItems = document.querySelectorAll(".lang-item");
      langItems.forEach(item => {
        const text = item.innerText.toLowerCase();
        const isEnItem = text.includes("anh") || text.includes("english");
        const shouldBeActive = (currentLang === "en" && isEnItem) || (currentLang === "vi" && !isEnItem);
        
        if (shouldBeActive) {
          item.classList.add("active");
          item.querySelector(".check-icon").style.display = "inline-block";
          const btnLangText = document.querySelector("#btn-lang .val-text");
          if (btnLangText) {
            btnLangText.innerHTML = `<span data-i18n="profile-lang-val">${window.sakedoI18n.translate("profile-lang-val")}</span> <i class="fa-solid fa-chevron-right arrow"></i>`;
          }
        } else {
          item.classList.remove("active");
          item.querySelector(".check-icon").style.display = "none";
        }
      });
    }
  }
}

// Trigger load on page changed
document.addEventListener("pageChanged", function (e) {
  if (e.detail.page === "profile") {
    loadUserProfile();
  }
});

// Also trigger on DOMContentLoaded if profile is the first page loaded
document.addEventListener("DOMContentLoaded", () => {
  if (document.querySelector(".profile-container")) {
    loadUserProfile();
  }
});
