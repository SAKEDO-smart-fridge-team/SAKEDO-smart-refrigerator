async function navigate(page, element) {
  const root = document.getElementById("app-root");

  try {
    // 0. Bắt đầu ẩn nội dung hiện tại
    root.classList.add("page-loading");
    root.classList.remove("fade-in");

    // 1. Tải nội dung file HTML từ thư mục pages/
    const response = await fetch(`pages/${page}.html`);
    const html = await response.text();

    // 2. Đổ nội dung vào vùng main
    root.innerHTML = html;

    // Dispatch event to notify scripts that DOM has changed
    document.dispatchEvent(new CustomEvent('pageChanged', { detail: { page: page } }));

    // 2.5 Hiển thị mượt mà
    // Dùng setTimeout cực ngắn để trình duyệt nhận diện content mới xong mới hiện
    setTimeout(() => {
      root.classList.remove("page-loading");
      root.classList.add("fade-in");
    }, 50);

    // 3. Xử lý UI cho Sidebar (Đổi màu icon khi được chọn)
    document
      .querySelectorAll(".nav-item")
      .forEach((item) => item.classList.remove("active"));
    if (element) element.classList.add("active");
  } catch (error) {
    console.error("Lỗi chuyển trang:", error);
    root.innerHTML = "<h2>Trang đang được phát triển...</h2>";
    root.classList.remove("page-loading");
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
