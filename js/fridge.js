/* js/fridge.js */

const fridgeData = [
  // Ngăn lạnh (Cool)
  { name: "Trứng gà", img: "assets/images/trungga.png", expiryDate: "2026-04-15", qty: "10 quả", category: "cool" },
  { name: "Sữa bò", img: "assets/images/suabo.png", expiryDate: "2026-05-05", qty: "03", category: "cool" },
  { name: "Cà chua", img: "assets/images/tulanh.png", expiryDate: "2026-04-08", qty: "0.5kg", category: "cool" },
  
  // Ngăn đá (Frozen)
  { name: "Mando", img: "assets/images/mando.png", expiryDate: "2026-04-06", qty: "01", category: "frozen" },
  { name: "Thịt heo", img: "assets/images/thitheo.png", expiryDate: "2026-04-06", qty: "0.5kg", category: "frozen" },
  { name: "Cá Thu", img: "assets/images/cathu.png", expiryDate: "2026-04-10", qty: "0.8kg", category: "frozen" },
  { name: "Cá viên", img: "assets/images/khac.png", expiryDate: "2026-05-20", qty: "1 túi", category: "frozen" },
  { name: "Kem Box", img: "assets/images/cake.png", expiryDate: "2026-04-15", qty: "1 hộp", category: "frozen" }
];

const suggestedRecipes = [
  { title: "Cá chiên sốt cà", img: "assets/images/cathu.png", type: "mặn" },
  { title: "Canh chua cá", img: "assets/img/canhchua.png", type: "canh" },
  { title: "Trứng chiên cà", img: "assets/img/trungchien.png", type: "mặn" }
];

let currentFridgeTab = "all";
let itemsToShow = 4; // Số lượng món hiển thị ban đầu

function initFridgePage() {
  itemsToShow = 4; // Reset khi đổi trang
  renderFridgeList(currentFridgeTab);
  renderSuggestedRecipes();
  setupFridgeTabs();
  
  const btnMore = document.querySelector(".btn-view-more");
  if (btnMore) {
    btnMore.onclick = () => {
      itemsToShow += 4;
      renderFridgeList(currentFridgeTab);
      if (window.showToast) window.showToast("Đã tải thêm món ăn", "success");
    };
  }
}

function setupFridgeTabs() {
  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((tab, index) => {
    tab.onclick = () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      
      const categories = ["all", "frozen", "cool"];
      currentFridgeTab = categories[index];
      itemsToShow = 4; // Reset số lượng hiển thị khi đổi tab
      renderFridgeList(currentFridgeTab);
    };
  });
}

function openItemDetail(name) {
  const item = fridgeData.find(i => i.name === name);
  if (!item) return;

  const modal = document.getElementById("item-detail-modal");
  const img = document.getElementById("detail-item-img");
  const nameEl = document.getElementById("detail-item-name");
  const badge = document.getElementById("detail-item-status-badge");
  
  const infoStatus = document.getElementById("detail-info-status");
  const infoCategory = document.getElementById("detail-info-category");
  const infoLocation = document.getElementById("detail-info-location");
  const infoQty = document.getElementById("detail-info-qty");

  const daysLeft = calculateDaysLeft(item.expiryDate);
  const isExpired = daysLeft <= 0;
  
  img.src = item.img;
  nameEl.innerText = item.name;
  
  if (isExpired) {
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

  const categoryMap = { "cool": "Ngăn lạnh", "frozen": "Ngăn đá", "dry": "Ngăn khô" };
  infoCategory.innerText = item.category === "cool" ? (item.name.includes("Sữa") ? "Sữa & Phô mai" : "Thực phẩm tươi") : "Thực phẩm đông lạnh";
  infoLocation.innerText = categoryMap[item.category] || "Tủ lạnh";
  infoQty.innerText = item.qty;

  modal.classList.add("show");
}

function closeItemDetail() {
  const modal = document.getElementById("item-detail-modal");
  if (modal) modal.classList.remove("show");
}

function calculateDaysLeft(expiryDate) {
  const today = new Date();
  const expiry = new Date(expiryDate);
  const diffTime = expiry - today;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function getStarClass(daysLeft) {
  if (daysLeft < 3) return "star-red";
  if (daysLeft < 7) return "star-yellow";
  return "star-green";
}

function renderFridgeList(category = "all") {
  const listContainer = document.getElementById("fridge-list-container");
  const viewMoreBtn = document.querySelector(".view-more-container");
  if (!listContainer) return;

  let filteredData = fridgeData;
  if (category !== "all") {
    filteredData = fridgeData.filter(item => item.category === category);
  }
  
  if (filteredData.length === 0) {
    listContainer.innerHTML = `<p style="text-align:center; padding: 40px; color: #999;">Không có thực phẩm nào trong ngăn này.</p>`;
    if (viewMoreBtn) viewMoreBtn.style.display = "none";
    return;
  }

  // Xử lý nút Xem thêm
  if (viewMoreBtn) {
    viewMoreBtn.style.display = filteredData.length > itemsToShow ? "block" : "none";
  }

  const itemsToDisplay = filteredData.slice(0, itemsToShow);

  let html = "";
  itemsToDisplay.forEach(item => {
    const daysLeft = calculateDaysLeft(item.expiryDate);
    const starClass = getStarClass(daysLeft);
    const expiryText = daysLeft > 0 ? `${daysLeft} ngày nữa...!` : "Đã hết hạn!";

    html += `
      <div class="fridge-item-row" onclick="openItemDetail('${item.name}')">
        <div class="status-star ${starClass}">
          <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
            <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
          </svg>
        </div>
        <div class="item-img">
          <img src="${item.img}" alt="${item.name}" onerror="this.src='https://via.placeholder.com/80?text=Food'">
        </div>
        <div class="item-info">
          <h3>${item.name}</h3>
          <p>${expiryText}</p>
        </div>
        <div class="item-qty">${item.qty}</div>
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

  let html = "";
  suggestedRecipes.forEach(recipe => {
    html += `
      <div class="recipe-suggest-card" onclick="navigate('recipe-detail')">
        <img src="${recipe.img}" alt="${recipe.title}">
        <div class="recipe-overlay">
          <h3>${recipe.title}</h3>
          <div class="category-icon">
            <i class="fa-solid fa-bowl-food"></i>
          </div>
        </div>
      </div>
    `;
  });

  suggestContainer.innerHTML = html;
}

// Lắng nghe sự kiện chuyển trang để init
document.addEventListener("pageChanged", (e) => {
  if (e.detail.page === "fridge") {
    initFridgePage();
  }
});
