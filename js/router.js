async function navigate(page, element) {
  const root = document.getElementById("app-root");

  try {
    // 1. Tải nội dung file HTML từ thư mục pages/
    const response = await fetch(`pages/${page}.html`);
    const html = await response.text();

    // 2. Đổ nội dung vào vùng main
    root.innerHTML = html;

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

// Khi vừa mở web, tự động hiện trang Profile
window.addEventListener("DOMContentLoaded", () => {
  const defaultTab = document.getElementById("default-tab");
  navigate("profile", defaultTab);
});
