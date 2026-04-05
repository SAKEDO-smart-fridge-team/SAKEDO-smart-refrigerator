/* js/favorite.js */

// Hàm khởi tạo trang yêu thích
function initFavoritePage() {
  const gridContainer = document.getElementById("favorite-grid-container");
  if (!gridContainer) return;

  const favorites = JSON.parse(localStorage.getItem("sakedo_favorites") || "[]");

  if (favorites.length === 0) {
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
  favorites.forEach((recipe, index) => {
    const formattedDate = new Date(recipe.date).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });

    html += `
      <div class="fav-card" style="animation-delay: ${index * 0.1}s">
        <div class="fav-img-wrapper">
          <img src="${recipe.img}" alt="${recipe.title}" onerror="this.src='https://via.placeholder.com/300x180?text=Recipe'">
          <button class="btn-remove-fav" onclick="removeFavorite('${recipe.title}')" title="Xóa khỏi yêu thích">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
        <div class="fav-info">
          <h3>${recipe.title}</h3>
          <span class="fav-date">Đã lưu: ${formattedDate}</span>
          <button class="btn-view-fav" onclick="viewFavoriteDetail('${recipe.title}', '${recipe.img}')">
            Xem ngay <i class="fa-solid fa-chevron-right" style="font-size: 10px; margin-left: 5px;"></i>
          </button>
        </div>
      </div>
    `;
  });
  html += '</div>';
  gridContainer.innerHTML = html;
}

// Hàm xóa khỏi yêu thích
function removeFavorite(title) {
  let favorites = JSON.parse(localStorage.getItem("sakedo_favorites") || "[]");
  favorites = favorites.filter(f => f.title !== title);
  localStorage.setItem("sakedo_favorites", JSON.stringify(favorites));
  
  if (window.showToast) window.showToast("Đã xóa khỏi danh sách yêu thích", "info");
  
  // Tải lại danh sách mượt mà
  initFavoritePage();
}

// Hàm xem chi tiết (Điều hướng ngược lại Detail)
function viewFavoriteDetail(title, img) {
  // Vì hiện tại Detail phụ thuộc vào sakedo_selected_recipe trong localStorage
  // Chúng ta cần giả lập object này để Recipe Detail có thể load đúng (cần thêm ingredients/steps nếu muốn đầy đủ)
  // Tuy nhiên, vì favorites hiện tại chỉ lưu Title/Img, ta sẽ tìm lại trong aiSuggestedFoods nếu có
  
  const allFoods = typeof aiSuggestedFoods !== 'undefined' ? aiSuggestedFoods : [];
  let fullRecipe = allFoods.find(f => f.name === title);

  if (!fullRecipe) {
    // Nếu không tìm thấy (ví dụ food từ nguồn khác), ta dùng tạm data tối thiểu
    fullRecipe = { name: title, img: img, ingredients: { available: [], missing: [] }, steps: [] };
  }

  localStorage.setItem("sakedo_selected_recipe", JSON.stringify({
    title: fullRecipe.name || title,
    img: fullRecipe.img || img,
    ingredients: fullRecipe.ingredients || { available: [], missing: [] },
    steps: fullRecipe.steps || []
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
