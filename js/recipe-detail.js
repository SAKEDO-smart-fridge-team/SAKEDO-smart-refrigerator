// js/recipe-detail.js

function startCooking() {
  if (typeof navigate === "function") {
    navigate('cooking-steps');
  } else {
    alert("Vào bếp thôi!");
  }
}

function _getLocalFavorites() {
  try {
    return JSON.parse(localStorage.getItem("sakedo_favorites") || "[]");
  } catch {
    return [];
  }
}

function _setFavoriteButtonState(isFavorite) {
  const btn = document.getElementById("btn-favorite-recipe");
  if (!btn) return;
  const icon = btn.querySelector("i");
  if (!icon) return;

  if (isFavorite) {
    btn.classList.add("active");
    icon.className = "fa-solid fa-heart";
  } else {
    btn.classList.remove("active");
    icon.className = "fa-regular fa-heart";
  }
}

function _buildFavoritePayload(recipe) {
  return {
    title: recipe.title || "Món ăn",
    img: recipe.img || "assets/images/khac.png",
    ingredients: recipe.ingredients || { available: [], missing: [] },
    steps: recipe.steps || [],
    prepTime: recipe.prepTime || null
  };
}

// Logic cho nút Yêu thích (Favorite)
async function toggleFavorite() {
  const savedData = localStorage.getItem("sakedo_selected_recipe");
  if (!savedData) return;

  const recipe = JSON.parse(savedData);
  const auth = window.sakedoApi?.getStoredAuth();

  if (!auth?.access_token) {
    let favorites = _getLocalFavorites();
    const existingIdx = favorites.findIndex((f) => f.title === recipe.title);

    if (existingIdx > -1) {
      favorites.splice(existingIdx, 1);
      _setFavoriteButtonState(false);
      if (window.showToast) window.showToast("Đã xóa khỏi mục yêu thích", "info");
    } else {
      favorites.push({
        ..._buildFavoritePayload(recipe),
        date: new Date().toISOString()
      });
      _setFavoriteButtonState(true);
      if (window.showToast) window.showToast("Đã lưu vào mục yêu thích", "success");
    }

    localStorage.setItem("sakedo_favorites", JSON.stringify(favorites));
    return;
  }

  try {
    const favorites = await window.sakedoApi.getFavorites();
    const existing = favorites.find((f) => f.title === recipe.title);

    if (existing?.id) {
      await window.sakedoApi.deleteFavorite(existing.id);
      _setFavoriteButtonState(false);
      if (window.showToast) window.showToast("Đã xóa khỏi mục yêu thích", "info");
    } else {
      await window.sakedoApi.createFavorite(_buildFavoritePayload(recipe));
      _setFavoriteButtonState(true);
      if (window.showToast) window.showToast("Đã lưu vào mục yêu thích", "success");
    }
  } catch (error) {
    console.error("Không thể cập nhật yêu thích:", error);
    if (window.showToast) window.showToast("Không thể cập nhật mục yêu thích", "error");
  }
}

async function checkFavoriteStatus(recipeTitle) {
  const auth = window.sakedoApi?.getStoredAuth();

  if (!auth?.access_token) {
    const favorites = _getLocalFavorites();
    _setFavoriteButtonState(favorites.some((f) => f.title === recipeTitle));
    return;
  }

  try {
    const favorites = await window.sakedoApi.getFavorites();
    _setFavoriteButtonState(favorites.some((f) => f.title === recipeTitle));
  } catch (error) {
    console.error("Không thể kiểm tra trạng thái yêu thích:", error);
    _setFavoriteButtonState(false);
  }
}

// Khởi tạo trang chi tiết nguyên liệu khi được render
function initRecipeDetail() {
  const container = document.querySelector(".recipe-detail-container");
  if (!container) return;

  const savedData = localStorage.getItem("sakedo_selected_recipe");
  if (!savedData) return;

  try {
    const savedDataObj = JSON.parse(savedData);
    const { title, img, source } = savedDataObj;
    const titleEl = document.getElementById("detail-recipe-title");
    const imgEl = document.getElementById("detail-recipe-img");

    if (titleEl && title) titleEl.innerText = title;
    if (imgEl && img) {
      imgEl.src = img;
      imgEl.onerror = () => { imgEl.src = "assets/images/khac.png"; };
    }

    // Cập nhật nút Trở về theo trang nguồn
    const btnBack = container.querySelector(".btn-back");
    if (btnBack) {
      const backPage = source === "fridge" ? "fridge" : "ai-chat";
      const backNavItem = source === "fridge"
        ? "document.querySelectorAll('.nav-item')[1]"
        : "document.querySelectorAll('.nav-item')[3]";
      btnBack.setAttribute("onclick", `navigate('${backPage}', ${backNavItem})`);
    }

    checkFavoriteStatus(title);

    if (savedDataObj.ingredients) {
      renderIngredients(savedDataObj.ingredients);
    }
  } catch (e) {
    console.error("Lỗi parse data món ăn:", e);
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

document.addEventListener("pageChanged", (e) => {
  if (e.detail.page === "recipe-detail") {
    initRecipeDetail();
  }
});

