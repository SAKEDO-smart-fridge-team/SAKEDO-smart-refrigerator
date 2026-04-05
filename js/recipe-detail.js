// js/recipe-detail.js

function startCooking() {
  if (typeof navigate === "function") {
    navigate('cooking-steps');
  } else {
    alert("Vào bếp thôi!");
  }
}

// Logic cho nút Yêu thích (Favorite)
function toggleFavorite() {
  const btn = document.getElementById("btn-favorite-recipe");
  const icon = btn.querySelector("i");
  
  const savedData = localStorage.getItem("sakedo_selected_recipe");
  if (!savedData) return;
  
  const recipe = JSON.parse(savedData);
  let favorites = JSON.parse(localStorage.getItem("sakedo_favorites") || "[]");
  
  const existingIdx = favorites.findIndex(f => f.title === recipe.title);
  
  if (existingIdx > -1) {
    // Xóa khỏi yêu thích
    favorites.splice(existingIdx, 1);
    btn.classList.remove("active");
    icon.className = "fa-regular fa-heart";
    if (window.showToast) window.showToast("Đã xóa khỏi mục yêu thích", "info");
  } else {
    // Thêm vào yêu thích
    favorites.push({
      title: recipe.title,
      img: recipe.img,
      date: new Date().toISOString()
    });
    btn.classList.add("active");
    icon.className = "fa-solid fa-heart";
    if (window.showToast) window.showToast("Đã lưu vào mục yêu thích", "success");
  }
  
  localStorage.setItem("sakedo_favorites", JSON.stringify(favorites));
}

function checkFavoriteStatus(recipeTitle) {
  const btn = document.getElementById("btn-favorite-recipe");
  if (!btn) return;
  const icon = btn.querySelector("i");
  
  const favorites = JSON.parse(localStorage.getItem("sakedo_favorites") || "[]");
  const isFavorite = favorites.some(f => f.title === recipeTitle);
  
  if (isFavorite) {
    btn.classList.add("active");
    icon.className = "fa-solid fa-heart";
  } else {
    btn.classList.remove("active");
    icon.className = "fa-regular fa-heart";
  }
}

// Khởi tạo trang chi tiết nguyên liệu khi được render
function initRecipeDetail() {
  const container = document.querySelector(".recipe-detail-container");
  if (!container) return; // Không ở trang này

  // Load data từ localStorage
  const savedData = localStorage.getItem("sakedo_selected_recipe");
  if (savedData) {
    try {
      const savedDataObj = JSON.parse(savedData);
      const { title, img } = savedDataObj;
      const titleEl = document.getElementById("detail-recipe-title");
      const imgEl = document.getElementById("detail-recipe-img");
      
      if (titleEl && title) titleEl.innerText = title;
      if (imgEl && img) imgEl.src = img;

      // Cập nhật trạng thái nút yêu thích
      checkFavoriteStatus(title);

      // Render Ingredients if available
      if (savedDataObj.ingredients) {
        renderIngredients(savedDataObj.ingredients);
      }
    } catch (e) {
      console.error("Lỗi parse data món ăn:", e);
    }
  }
}

function renderIngredients(ingredientsObj) {
  const renderList = (elementId, list, iconClass) => {
    const listEl = document.getElementById(elementId);
    if (!listEl || !list) return;
    let html = "";
    list.forEach(item => {
      html += `
        <div class="ingredient-item">
          <div class="ing-icon ${iconClass}"></div>
          <div class="ing-info">
            <span class="ing-name">${item.name}</span>
            <span class="ing-weight">${item.weight}</span>
          </div>
        </div>
      `;
    });
    listEl.innerHTML = html;
  };
  
  renderList("available-ingredients", ingredientsObj.available, "available-icon");
  renderList("missing-ingredients", ingredientsObj.missing, "missing-icon");
}

// Xử lý sự kiện tick nguyên liệu và MutationObserver để chạy initRecipeDetail
document.addEventListener("click", function(e) {
  // Logic đánh dấu (tick) nguyên liệu đã chuẩn bị/đã mua
  const ingredientItem = e.target.closest(".ingredient-item");
  if (ingredientItem && ingredientItem.closest(".recipe-content")) {
    const icon = ingredientItem.querySelector(".ing-icon");
    if (icon) {
      if (icon.classList.contains("ticked")) {
        // Bỏ tick
        icon.classList.remove("ticked");
        icon.innerHTML = "";
        ingredientItem.classList.remove("ticked");
      } else {
        // Đánh dấu tick
        icon.classList.add("ticked");
        icon.innerHTML = '<i class="fa-solid fa-check" style="color: white; font-size: 14px;"></i>';
        ingredientItem.classList.add("ticked");
      }
    }
  }
});

// Quan sát thay đổi DOM để phát hiện khi trang recipe-detail được load bằng router.js
const appRoot = document.getElementById("app-root");
if (appRoot) {
  const observer = new MutationObserver((mutations) => {
    for (let m of mutations) {
      if (m.addedNodes.length > 0) {
        initRecipeDetail();
      }
    }
  });
  observer.observe(appRoot, { childList: true });
} else {
  // Fallback nếu chạy riêng lẻ hoặc script load sau cùng
  document.addEventListener("DOMContentLoaded", initRecipeDetail);
}

