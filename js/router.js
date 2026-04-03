async function navigate(page, element) {
  const root = document.getElementById("app-root");

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

    // 3. Xử lý UI cho Sidebar (Đổi màu icon khi được chọn)
    document
      .querySelectorAll(".nav-item")
      .forEach((item) => item.classList.remove("active"));
    if (element) element.classList.add("active");
  } catch (error) {
    console.error("Lỗi chuyển trang:", error);
    root.innerHTML = "<h2>Trang đang được phát triển...</h2>";
  }
}

// ==========================================
// LOGIC CHUYỂN ĐỔI CHẾ ĐỘ SÁNG / TỐI (THEME)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const btnLight = document.getElementById("btn-light");
  const btnDark = document.getElementById("btn-dark");
  const body = document.body;

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
    localStorage.setItem("sakedo_theme", "dark"); // Lưu lại lựa chọn
    btnDark.classList.add("active");
    btnLight.classList.remove("active");
  });

  // 3. Khi nhấn nút SÁNG (Light)
  btnLight.addEventListener("click", () => {
    body.classList.remove("dark-theme");
    localStorage.setItem("sakedo_theme", "light"); // Lưu lại lựa chọn
    btnLight.classList.add("active");
    btnDark.classList.remove("active");
  });
});
