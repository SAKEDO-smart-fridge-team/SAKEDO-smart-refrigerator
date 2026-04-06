/* js/fridge.js */

let fridgeData = [];
let currentFridgeTab = "all";
let itemsToShow = 6;
let currentEditingItemId = null;
let currentAdjustAction = null;

const suggestedRecipes = [
  { title: "Cá chiên sốt cà", img: "assets/images/cathu.png", type: "man" },
  { title: "Canh chua cá", img: "assets/img/canhchua.png", type: "canh" },
  { title: "Trứng chiên cà", img: "assets/img/trungchien.png", type: "man" }
];

function calculateDaysLeft(expiryDate) {
  if (!expiryDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiryDate);
  expiry.setHours(0, 0, 0, 0);

  const diffTime = expiry - today;
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

function getStarClass(daysLeft) {
  if (daysLeft === null) return "star-green";
  if (daysLeft < 0) return "star-red";
  if (daysLeft < 3) return "star-yellow";
  return "star-green";
}

function tabToLocation(tab) {
  if (tab === "frozen") return "ngandong";
  if (tab === "cool") return "cool-group";
  return "all";
}

function normalizeItems(items) {
  return (items || []).map((item) => ({
    id: item.id,
    name: item.name,
    img: "assets/images/khac.png",
    expiryDate: item.expiry_date || null,
    quantity: Number(item.quantity) || 1,
    location: item.location || "tulanh",
    itemCategory: item.category || "khac",
    note: item.note || ""
  }));
}

function getCurrentItem() {
  return fridgeData.find((item) => item.id === currentEditingItemId) || null;
}

async function fetchFridgeItems() {
  if (!window.sakedoApi?.getStoredAuth()?.access_token) {
    fridgeData = [];
    renderFridgeList(currentFridgeTab);
    return;
  }

  const listContainer = document.getElementById("fridge-list-container");
  if (listContainer) {
    listContainer.innerHTML = `<p class="loading-text">Đang tải thực phẩm...</p>`;
  }

  try {
    const items = await window.sakedoApi.getFridgeItems();
    fridgeData = normalizeItems(items);
    renderFridgeList(currentFridgeTab);
  } catch (error) {
    if (listContainer) {
      listContainer.innerHTML = `<p style="text-align:center; padding: 40px; color: #d35f5f;">${error.message || "Không tải được dữ liệu tủ lạnh."}</p>`;
    }
  }
}

async function refreshFridgeAndKeepTab() {
  await fetchFridgeItems();
  renderFridgeList(currentFridgeTab);
}

function setupFridgeTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((tab, index) => {
    tab.onclick = () => {
      tabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const categories = ["all", "frozen", "cool"];
      currentFridgeTab = categories[index];
      itemsToShow = 6;
      renderFridgeList(currentFridgeTab);
    };
  });
}

function renderFridgeList(category = "all") {
  const listContainer = document.getElementById("fridge-list-container");
  const viewMoreBtn = document.querySelector(".view-more-container");
  if (!listContainer) return;

  let filteredData = fridgeData;
  if (category !== "all") {
    const expectedLocation = tabToLocation(category);
    if (expectedLocation === "cool-group") {
      filteredData = fridgeData.filter((item) => item.location === "tulanh" || item.location === "nganlanh");
    } else {
      filteredData = fridgeData.filter((item) => item.location === expectedLocation);
    }
  }

  if (filteredData.length === 0) {
    listContainer.innerHTML = `<p style="text-align:center; padding: 40px; color: #999;">Chưa có thực phẩm nào trong ngăn này.</p>`;
    if (viewMoreBtn) viewMoreBtn.style.display = "none";
    return;
  }

  if (viewMoreBtn) {
    viewMoreBtn.style.display = filteredData.length > itemsToShow ? "block" : "none";
  }

  const itemsToDisplay = filteredData.slice(0, itemsToShow);
  let html = "";

  itemsToDisplay.forEach((item) => {
    const daysLeft = calculateDaysLeft(item.expiryDate);
    const starClass = getStarClass(daysLeft);
    const expiryText =
      daysLeft === null ? "Chưa có hạn dùng" : daysLeft >= 0 ? `${daysLeft} ngày nữa...!` : "Đã hết hạn!";

    html += `
      <div class="fridge-item-row" onclick="openItemDetail('${item.id}')">
        <div class="status-star ${starClass}">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        </div>
        <div class="item-img">
          <img src="${item.img}" alt="${item.name}">
        </div>
        <div class="item-info">
          <h3>${item.name}</h3>
          <p>${expiryText}</p>
        </div>
        <div class="item-qty">x${item.quantity}</div>
        <div class="item-action">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="m9 18 6-6-6-6"/>
          </svg>
        </div>
      </div>
    `;
  });

  listContainer.innerHTML = html;
}

function renderSuggestedRecipes() {
  const suggestContainer = document.getElementById("suggested-recipes-grid");
  if (!suggestContainer) return;

  suggestContainer.innerHTML = suggestedRecipes
    .map(
      (recipe) => `
      <div class="recipe-suggest-card" onclick="navigate('recipe-detail')">
        <img src="${recipe.img}" alt="${recipe.title}">
        <div class="recipe-overlay">
          <h3>${recipe.title}</h3>
          <div class="category-icon">
            <i class="fa-solid fa-bowl-food"></i>
          </div>
        </div>
      </div>
    `
    )
    .join("");
}

function openItemDetail(itemId) {
  const item = fridgeData.find((i) => i.id === itemId);
  if (!item) return;

  currentEditingItemId = item.id;
  hideQuantityInput();
  resetEditMode();

  const modal = document.getElementById("item-detail-modal");
  const img = document.getElementById("detail-item-img");
  const nameEl = document.getElementById("detail-item-name");
  const badge = document.getElementById("detail-item-status-badge");

  const infoStatus = document.getElementById("detail-info-status");
  const infoCategory = document.getElementById("detail-info-category");
  const infoLocation = document.getElementById("detail-info-location");
  const infoQty = document.getElementById("detail-info-qty");

  const daysLeft = calculateDaysLeft(item.expiryDate);

  img.src = item.img;
  nameEl.innerText = item.name;

  if (daysLeft === null) {
    badge.innerText = "Chưa có hạn dùng";
    badge.className = "status-badge active";
    infoStatus.innerText = "Đang theo dõi";
    infoStatus.style.color = "#4edbba";
  } else if (daysLeft < 0) {
    badge.innerText = "Đã hết hạn";
    badge.className = "status-badge expired";
    infoStatus.innerText = "Đã hết hạn";
    infoStatus.style.color = "#ff6b6b";
  } else {
    badge.innerText = daysLeft < 3 ? "Sắp hết hạn" : `${daysLeft} ngày nữa`;
    badge.className = daysLeft < 3 ? "status-badge warning" : "status-badge active";
    infoStatus.innerText = daysLeft < 3 ? "Sắp hết hạn" : "Còn tươi";
    infoStatus.style.color = daysLeft < 3 ? "#ff6b6b" : "#4edbba";
  }

  const categoryMap = {
    milk: "Sữa & Phô mai",
    thit: "Thịt & Hải sản",
    traicay: "Rau & Trái cây",
    douong: "Đồ uống",
    khac: "Khác"
  };

  const locationMap = {
    tulanh: "Tủ lạnh",
    ngandong: "Ngăn đông",
    nganlanh: "Ngăn lạnh"
  };

  infoCategory.innerText = categoryMap[item.itemCategory] || "Khác";
  infoLocation.innerText = locationMap[item.location] || "Tủ lạnh";
  infoQty.innerText = `x${item.quantity}`;

  const nameInput = document.getElementById("edit-name-input");
  const qtyInput = document.getElementById("edit-qty-input");
  const locationInput = document.getElementById("edit-location-input");
  const categoryInput = document.getElementById("edit-category-input");
  if (nameInput) nameInput.value = item.name;
  if (qtyInput) qtyInput.value = item.quantity;
  if (locationInput) locationInput.value = item.location || "tulanh";
  if (categoryInput) categoryInput.value = item.itemCategory || "khac";

  modal.classList.add("show");
}

function closeItemDetail() {
  const modal = document.getElementById("item-detail-modal");
  if (modal) modal.classList.remove("show");
  currentEditingItemId = null;
}

function showQuantityInput(action) {
  currentAdjustAction = action;
  const currentItem = getCurrentItem();
  if (!currentItem) return;

  const area = document.getElementById("qty-adjust-area");
  const mainBtns = document.getElementById("main-action-buttons");
  const title = document.getElementById("qty-adjust-title");
  const unitLabel = document.getElementById("qty-adjust-unit");
  const input = document.getElementById("qty-adjust-input");

  if (area && mainBtns) {
    mainBtns.style.display = "none";
    area.style.display = "flex";
    title.innerText = action === "use" ? "Sử dụng bao nhiêu?" : "Xóa bao nhiêu?";
    unitLabel.innerText = "món";
    input.value = 1;
    input.max = currentItem.quantity;
    input.min = 1;
    input.focus();
  }
}

function hideQuantityInput() {
  const area = document.getElementById("qty-adjust-area");
  const mainBtns = document.getElementById("main-action-buttons");
  if (area && mainBtns) {
    area.style.display = "none";
    mainBtns.style.display = "flex";
  }
  currentAdjustAction = null;
}

function confirmQuantityAdjustment() {
  const input = document.getElementById("qty-adjust-input");
  const currentItem = getCurrentItem();
  if (!currentItem || !input) return;

  const quantity = Number(input.value);
  if (!Number.isFinite(quantity) || quantity <= 0) {
    if (window.showToast) window.showToast("Số lượng không hợp lệ", "error");
    return;
  }

  window.sakedoApi
    .adjustFridgeItem(currentItem.id, {
      action: currentAdjustAction || "use",
      quantity
    })
    .then(async (response) => {
      if (window.showToast) window.showToast(response?.message || "Đã cập nhật số lượng", "success");
      hideQuantityInput();
      closeItemDetail();
      await refreshFridgeAndKeepTab();
    })
    .catch((error) => {
      if (window.showToast) window.showToast(error.message || "Không thể cập nhật số lượng", "error");
    });
}

function resetEditMode() {
  const form = document.getElementById("edit-item-form");
  const grid = document.querySelector(".detail-info-grid");
  const title = document.getElementById("detail-item-name");
  const hero = document.querySelector(".detail-hero");
  const badge = document.getElementById("detail-item-status-badge");
  const editBtn = document.getElementById("btn-edit-fridge-item");
  const mainFooter = document.getElementById("main-action-buttons");
  const editFooter = document.getElementById("edit-action-buttons");

  if (form) form.style.display = "none";
  if (grid) grid.style.display = "grid";
  if (title) title.style.display = "block";
  if (hero) hero.style.display = "block";
  if (badge) badge.style.display = "inline-block";
  if (mainFooter) mainFooter.style.display = "flex";
  if (editFooter) editFooter.style.display = "none";

  if (editBtn) {
    editBtn.innerHTML = '<i class="fa-solid fa-pen-to-square"></i>';
    editBtn.classList.remove("btn-cancel-edit");
  }
}

function toggleEditFridgeItem(isSave = false) {
  const form = document.getElementById("edit-item-form");
  const grid = document.querySelector(".detail-info-grid");
  const title = document.getElementById("detail-item-name");
  const hero = document.querySelector(".detail-hero");
  const badge = document.getElementById("detail-item-status-badge");
  const editBtn = document.getElementById("btn-edit-fridge-item");
  const mainFooter = document.getElementById("main-action-buttons");
  const editFooter = document.getElementById("edit-action-buttons");

  if (!isSave && form && form.style.display === "none") {
    form.style.display = "block";
    if (grid) grid.style.display = "none";
    if (title) title.style.display = "none";
    if (hero) hero.style.display = "none";
    if (badge) badge.style.display = "none";
    if (mainFooter) mainFooter.style.display = "none";
    if (editFooter) editFooter.style.display = "block";
    if (editBtn) {
      editBtn.innerHTML = '<i class="fa-solid fa-xmark"></i>';
      editBtn.classList.add("btn-cancel-edit");
    }
    return;
  }

  if (isSave) {
    const currentItem = getCurrentItem();
    const nameInput = document.getElementById("edit-name-input");
    const qtyInput = document.getElementById("edit-qty-input");
    const locationInput = document.getElementById("edit-location-input");
    const categoryInput = document.getElementById("edit-category-input");

    if (!currentItem) return;

    const payload = {
      name: nameInput?.value?.trim() || currentItem.name,
      quantity: Math.max(1, Number(qtyInput?.value || currentItem.quantity || 1)),
      location: locationInput?.value || currentItem.location || "tulanh",
      category: categoryInput?.value || currentItem.itemCategory || "khac"
    };

    window.sakedoApi
      .updateFridgeItem(currentEditingItemId, payload)
      .then(async (response) => {
        if (window.showToast) window.showToast(response?.message || "Đã lưu thay đổi", "success");
        resetEditMode();
        closeItemDetail();
        await refreshFridgeAndKeepTab();
      })
      .catch((error) => {
        if (window.showToast) window.showToast(error.message || "Không thể lưu thay đổi", "error");
      });
    return;
  }

  resetEditMode();
}

function initFridgePage() {
  itemsToShow = 6;
  setupFridgeTabs();
  renderSuggestedRecipes();
  fetchFridgeItems();

  const btnMore = document.querySelector(".btn-view-more");
  if (btnMore) {
    btnMore.onclick = () => {
      itemsToShow += 6;
      renderFridgeList(currentFridgeTab);
    };
  }
}

window.openItemDetail = openItemDetail;
window.closeItemDetail = closeItemDetail;
window.showQuantityInput = showQuantityInput;
window.hideQuantityInput = hideQuantityInput;
window.confirmQuantityAdjustment = confirmQuantityAdjustment;
window.toggleEditFridgeItem = toggleEditFridgeItem;

document.addEventListener("pageChanged", (e) => {
  if (e.detail.page === "fridge") {
    initFridgePage();
  }
});
