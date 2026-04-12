/* js/favorite.js */

let currentFavoriteItems = [];
let favoriteActionBound = false;

function getLocalFavorites() {
  try {
    return JSON.parse(localStorage.getItem("sakedo_favorites") || "[]");
  } catch {
    return [];
  }
}

function normalizeFavoriteItem(recipe) {
  return {
    id: recipe.id || "",
    title: recipe.title || recipe.name || "Món ăn",
    img: recipe.img || "assets/images/khac.png",
    ingredients: recipe.ingredients || { available: [], missing: [] },
    steps: recipe.steps || [],
    prepTime: recipe.prepTime || null,
    created_at: recipe.created_at || recipe.date || new Date().toISOString()
  };
}

async function fetchFavoriteItems() {
  const auth = window.sakedoApi?.getStoredAuth();
  if (!auth?.access_token) {
    return getLocalFavorites().map(normalizeFavoriteItem);
  }

  const favorites = await window.sakedoApi.getFavorites();
  return (favorites || []).map(normalizeFavoriteItem);
}

function bindFavoriteActions() {
  if (favoriteActionBound) return;
  favoriteActionBound = true;

  document.addEventListener("click", async (event) => {
    const removeBtn = event.target.closest(".btn-remove-fav");
    if (removeBtn) {
      const idx = Number(removeBtn.dataset.index);
      if (!Number.isInteger(idx)) return;
      await removeFavoriteByIndex(idx);
      return;
    }

    const viewBtn = event.target.closest(".btn-view-fav");
    if (viewBtn) {
      const idx = Number(viewBtn.dataset.index);
      if (!Number.isInteger(idx)) return;
      viewFavoriteDetailByIndex(idx);
    }
  });
}

// Hàm khởi tạo trang yêu thích
async function initFavoritePage() {
  const gridContainer = document.getElementById("favorite-grid-container");
  if (!gridContainer) return;

  bindFavoriteActions();

  gridContainer.innerHTML = `
    <div class="fav-loading" style="text-align: center; padding: 50px;">
      <p style="color: #aaa;">Đang tải danh sách yêu thích...</p>
    </div>
  `;

  try {
    currentFavoriteItems = await fetchFavoriteItems();
  } catch (error) {
    console.error("Không thể tải danh sách yêu thích:", error);
    gridContainer.innerHTML = `
      <div class="fav-empty">
        <i class="fa-solid fa-triangle-exclamation empty-icon"></i>
        <h3>Không tải được danh sách yêu thích</h3>
        <p>Vui lòng thử lại sau ít phút.</p>
      </div>
    `;
    return;
  }

  if (currentFavoriteItems.length === 0) {
    gridContainer.innerHTML = `
      <div class="fav-empty">
        <i class="fa-solid fa-heart-crack empty-icon"></i>
        <h3>Chưa có món ăn yê thích nào!</h3>
        <p>Cậu hãy khám phá các món ngon từ Mr. Chè và lưu lại tại đây nhé.</p>
        <button class="btn-explore" onclick="navigate('ai-chat')">Khám phá ngay</button>
      </div>
    `;
    return;
  }

  let html = '<div class="fav-grid">';
  currentFavoriteItems.forEach((recipe, index) => {
    const formattedDate = new Date(recipe.created_at).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    html += `
      <div class="fav-card" style="animation-delay: ${index * 0.1}s">
        <div class="fav-img-wrapper">
          <img src="${recipe.img}" alt="${recipe.title}" onerror="this.src='assets/images/khac.png'">
          <button class="btn-remove-fav" data-index="${index}" title="Xóa khỏi yêu thích">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
        <div class="fav-info">
          <h3>${recipe.title}</h3>
          <span class="fav-date">Đã lưu: ${formattedDate}</span>
          <button class="btn-view-fav" data-index="${index}">
            Xem ngay <i class="fa-solid fa-chevron-right" style="font-size: 10px; margin-left: 5px;"></i>
          </button>
        </div>
      </div>
    `;
  });
  html += '</div>';
  gridContainer.innerHTML = html;
}

async function removeFavoriteByIndex(index) {
  const favorite = currentFavoriteItems[index];
  if (!favorite) return;

  const auth = window.sakedoApi?.getStoredAuth();

  try {
    if (auth?.access_token && favorite.id) {
      await window.sakedoApi.deleteFavorite(favorite.id);
    } else {
      const localItems = getLocalFavorites().filter((item) => item.title !== favorite.title);
      localStorage.setItem("sakedo_favorites", JSON.stringify(localItems));
    }
    if (window.showToast) window.showToast("Đã xóa khỏi danh sách yêu thích", "info");
    await initFavoritePage();
  } catch (error) {
    console.error("Không thể xóa yêu thích:", error);
    if (window.showToast) window.showToast("Không thể xóa mục yêu thích", "error");
  }
}

// Hàm xem chi tiết (Điều hướng ngược lại Detail)
function viewFavoriteDetailByIndex(index) {
  const recipe = currentFavoriteItems[index];
  if (!recipe) return;

  localStorage.setItem("sakedo_selected_recipe", JSON.stringify({
    title: recipe.title,
    img: recipe.img,
    ingredients: recipe.ingredients || { available: [], missing: [] },
    steps: recipe.steps || [],
    prepTime: recipe.prepTime || null,
    source: "favorite"
  }));

  if (typeof navigate === "function") {
    navigate('recipe-detail');
  }
}

// Lắng nghe sự kiện chuyển trang
document.addEventListener("pageChanged", (e) => {
  if (e.detail.page === "favorite") {
    initFavoritePage();
  }
});
