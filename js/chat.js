// js/chat.js
document.addEventListener("click", function (e) {
  // Bấm nút làm mới
  if (e.target.closest(".btn-refresh")) {
    const welcomeState = document.getElementById("state-welcome");
    const foodState = document.getElementById("state-food-suggestion");
    const btnRecipe = document.querySelector(".btn-recipe");

    if (welcomeState && foodState && btnRecipe) {
      if (!welcomeState.classList.contains("hidden")) {
        // Mở màn hình hiển thị thức ăn
        welcomeState.classList.add("hidden");
        foodState.classList.remove("hidden");
        btnRecipe.removeAttribute("disabled"); // Cho phép bấm nút "Công thức"
      } else {
        // Nếu đã hiện, bấm làm mới -> random qua món khác
        const btnRight = document.querySelector(".btn-arrow.right");
        if(btnRight) btnRight.click();
      }
    }
  }

  // Bấm mũi tên Trái/Phải
  if (
    e.target.closest(".btn-arrow.left") ||
    e.target.closest(".btn-arrow.right")
  ) {
    const isNext = e.target.closest(".btn-arrow.right") ? 1 : -1;
    const foodState = document.getElementById("state-food-suggestion");
    const foodImage = document.getElementById("food-preview-img");
    const foodTitle = document.getElementById("food-preview-title");

    const foods = [
      { name: "Trứng chiên cà", img: "assets/img/trungchien.png" },
      { name: "Canh chua cá lóc", img: "assets/img/canhchua.png" },
    ];

    let currentIdx = parseInt(foodState.dataset.currentIndex || 0);
    currentIdx = (currentIdx + isNext + foods.length) % foods.length;
    foodState.dataset.currentIndex = currentIdx;

    // Hiệu ứng Fade logic
    foodImage.style.opacity = "0";
    setTimeout(() => {
      foodImage.src = foods[currentIdx].img;
      foodTitle.innerText = foods[currentIdx].name;
      foodImage.style.opacity = "1";
    }, 150);
  }

  // Xử lý báo thao tác Công thức
  if (e.target.closest(".btn-recipe")) {
    const btnRecipe = e.target.closest(".btn-recipe");
    if (!btnRecipe.hasAttribute("disabled")) {
      if (typeof window.showToast === "function") {
        window.showToast("Đang mở chi tiết công thức món ăn...", "success");
      } else {
        alert("Sẵn sàng hiển thị bảng nguyên liệu.");
      }
    }
  }
});
