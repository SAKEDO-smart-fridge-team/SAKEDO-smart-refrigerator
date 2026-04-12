async function navigate(page, element) {
  const root = document.getElementById("app-root");

  // Page exit fade
  root.style.opacity = "0";
  root.style.transform = "translateY(10px)";
  root.style.transition = "opacity 0.18s ease, transform 0.18s ease";

  await new Promise((resolve) => setTimeout(resolve, 180));

  try {
    // 1. Tải nội dung file HTML từ thư mục pages/
    const response = await fetch(`pages/${page}.html`);
    const html = await response.text();

    // 2. Đổ nội dung vào vùng main
    root.innerHTML = html;

    // 2b. Thực thi các thẻ <script> trong trang vừa load
    root.querySelectorAll("script").forEach((oldScript) => {
      const newScript = document.createElement("script");
      if (oldScript.src) {
        newScript.src = oldScript.src;
      } else {
        newScript.textContent = oldScript.textContent;
      }
      oldScript.parentNode.replaceChild(newScript, oldScript);
    });

    // 3. Xử lý UI cho Sidebar
    // Xóa active khỏi tất cả nav item và camera button
    document
      .querySelectorAll(".nav-item, .camera-btn")
      .forEach((item) => item.classList.remove("active"));

    // Chỉ add active nếu element là nav-item thực sự (không phải camera-btn)
    // Camera-btn không thay đổi visual khi active để tránh lỗi giao diện
    if (element && element.classList.contains("nav-item")) {
      element.classList.add("active");
    }

    // 4. Phát ra sự kiện báo hiệu trang đã đổi (Để các file JS riêng lẻ tự init)
    if (window.sakedoI18n) {
      window.sakedoI18n.translatePage();
    }

    // Page enter animation
    root.style.transition = "opacity 0.32s ease, transform 0.32s ease";
    root.style.opacity = "1";
    root.style.transform = "translateY(0)";

    document.dispatchEvent(new CustomEvent("pageChanged", { 
      detail: { page: page } 
    }));
  } catch (error) {
    console.error("Lỗi chuyển trang:", error);
    root.innerHTML = "<h2>Trang đang được phát triển...</h2>";
    root.style.opacity = "1";
    root.style.transform = "translateY(0)";
  }
}


// ==========================================
// LOGIC CHUYỂN ĐỔI CHẾ ĐỘ SÁNG / TỐI (THEME)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const btnLight = document.getElementById("btn-light");
  const btnDark = document.getElementById("btn-dark");
  const body = document.body;

  if (!btnLight || !btnDark) return;

  // 1. Kiểm tra xem lần trước người dùng đang xài chế độ nào (Lưu trong LocalStorage)
  const currentTheme = localStorage.getItem("sakedo_theme");

  if (currentTheme === "dark") {
    body.classList.add("dark-theme");
    btnDark.classList.add("active");
    btnLight.classList.remove("active");
  }

  // 2. Khi nhấn nút TỐI (Dark)
  btnDark.addEventListener("click", () => {
    body.classList.add("dark-theme");
    localStorage.setItem("sakedo_theme", "dark");
    btnDark.classList.add("active");
    btnLight.classList.remove("active");
  });

  // 3. Khi nhấn nút SÁNG (Light)
  btnLight.addEventListener("click", () => {
    body.classList.remove("dark-theme");
    localStorage.setItem("sakedo_theme", "light");
    btnLight.classList.add("active");
    btnDark.classList.remove("active");
  });
});

