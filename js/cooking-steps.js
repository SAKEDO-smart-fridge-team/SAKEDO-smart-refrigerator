// js/cooking-steps.js

/**
 * Chuẩn hoá chuỗi để so sánh tên nguyên liệu:
 * bỏ dấu, lowercase, trim khoảng trắng thừa.
 */
function normalizeCookingName(text) {
  return (text || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Hoàn thành nấu ăn:
 * 1. Lấy danh sách nguyên liệu "có sẵn" từ công thức
 * 2. Fetch tủ lạnh thực tế từ API
 * 3. Map từng nguyên liệu → item trong tủ lạnh (fuzzy match tên)
 * 4. Gọi adjustFridgeItem API để trừ số lượng
 * 5. Toast + navigate home
 */
async function finishCooking() {
  const savedData = localStorage.getItem("sakedo_selected_recipe");
  let recipe = null;
  try { recipe = savedData ? JSON.parse(savedData) : null; } catch { recipe = null; }

  const availableIngredients = recipe?.ingredients?.available || [];

  // Nếu không đăng nhập hoặc không có nguyên liệu cần trừ → chuyển trang luôn
  const isLoggedIn = window.sakedoApi?.getStoredAuth()?.access_token;
  if (!isLoggedIn || !availableIngredients.length) {
    if (typeof window.showToast === "function") {
      window.showToast("Chúc mừng bạn đã hoàn thành món ăn!", "success");
    }
    _navigateHome();
    return;
  }

  // Disable nút để tránh bấm 2 lần
  const finishBtn = document.querySelector(".btn-finish-cooking, [onclick='finishCooking()']");
  if (finishBtn) {
    finishBtn.disabled = true;
    finishBtn.textContent = "Đang cập nhật...";
  }

  try {
    // Lấy danh sách thực phẩm hiện tại trong tủ từ server
    const fridgeItems = await window.sakedoApi.getFridgeItems();

    // Match từng nguyên liệu trong công thức với item trong tủ
    const adjustCalls = [];

    availableIngredients.forEach((ingredient) => {
      const ingNorm = normalizeCookingName(ingredient.name);
      const useQty = Math.max(1, parseQuantity(ingredient.weight) || 1);

      // Tìm item trong tủ có tên gần khớp nhất
      const matched = fridgeItems.find((fi) => {
        const fiNorm = normalizeCookingName(fi.name);
        return fiNorm.includes(ingNorm) || ingNorm.includes(fiNorm);
      });

      if (matched) {
        const actualQty = Math.min(useQty, Number(matched.quantity) || 1);
        adjustCalls.push(
          window.sakedoApi
            .adjustFridgeItem(matched.id, { action: "use", quantity: actualQty })
            .catch((err) => {
              console.warn(`Không thể trừ "${matched.name}":`, err.message);
            })
        );
      }
    });

    // Thực hiện tất cả điều chỉnh song song
    await Promise.all(adjustCalls);

    const updatedCount = adjustCalls.length;
    if (typeof window.showToast === "function") {
      window.showToast(
        updatedCount > 0
          ? `Chúc mừng! Đã cập nhật ${updatedCount} nguyên liệu trong tủ lạnh.`
          : "Chúc mừng bạn đã hoàn thành món ăn!",
        "success"
      );
    }
  } catch (err) {
    console.error("Lỗi cập nhật tủ lạnh:", err);
    if (typeof window.showToast === "function") {
      window.showToast("Hoàn thành món ăn! (Lỗi khi cập nhật tủ lạnh tự động)", "info");
    }
  }

  _navigateHome();
}

function _navigateHome() {
  setTimeout(() => {
    if (typeof navigate === "function") {
      navigate("home", document.querySelector(".nav-item"));
    } else {
      window.location.href = "index.html";
    }
  }, 1500);
}

// Helper: Tách số từ chuỗi (vd: "500g" -> 500, "3 quả" -> 3)
function parseQuantity(str) {
  const match = str.match(/(\d+(\.\d+)?)/);
  return match ? parseFloat(match[1]) : 0;
}

// Helper: Tách đơn vị từ chuỗi (vd: "500g" -> "g")
function extractUnit(str) {
  return str.replace(/[\d\.\s]/g, "");
}

// Cấu trúc dữ liệu mẫu để sau này AI trả về JSON thì render theo format này
const defaultRecipeSteps = [
  {
    stepNumber: 1,
    title: "SƠ CHẾ NGUYÊN LIỆU:",
    instructions: [
      "Làm sạch: (Rửa, ngâm muối, khử mùi tanh/hôi...)",
      "Cắt thái: (Thái miếng, băm nhỏ, cắt khúc...)",
      "Ướp gia vị: (Tỉ lệ gia vị + Thời gian chờ để thấm...)"
    ]
  },
  {
    stepNumber: 2,
    title: "CHẾ BIẾN",
    instructions: [
      "Bước 1 (Tạo hương): (Phi thơm hành tỏi, áp chảo cá, xào sơ thịt...)",
      "Bước 2 (Nấu chính): (Thêm nước, điều chỉnh lửa, thời gian làm chín...)",
      "Bước 3 (Nêm nếm): (Cân chỉnh lại vị chua/cay/mặn/ngọt cuối cùng...)"
    ]
  },
  {
    stepNumber: 3,
    title: "HOÀN THIỆN & TRÌNH BÀY",
    instructions: [
      "Trình bày: (Múc ra bát/đĩa, rắc rau nêm, tiêu, tỏi phi...)",
      "Yêu cầu thành phẩm: (Màu sắc ra sao, vị đặc trưng thế nào...)"
    ]
  }
];

function renderCookingIngredients(ingredients) {
  const availableListEl = document.getElementById("cooking-available-ingredients");
  const missingListEl = document.getElementById("cooking-missing-ingredients");
  const availableCountEl = document.getElementById("cooking-available-count");
  const missingCountEl = document.getElementById("cooking-missing-count");

  const available = ingredients?.available || [];
  const missing = ingredients?.missing || [];

  if (availableCountEl) availableCountEl.textContent = String(available.length);
  if (missingCountEl) missingCountEl.textContent = String(missing.length);

  if (availableListEl) {
    availableListEl.innerHTML = available.length
      ? available.map((item) => `<li>${item.name} (${item.weight || "1 phần"})</li>`).join("")
      : "<li>Không có dữ liệu</li>";
  }

  if (missingListEl) {
    missingListEl.innerHTML = missing.length
      ? missing.map((item) => `<li>${item.name} (${item.weight || "1 phần"})</li>`).join("")
      : "<li>Không cần mua thêm</li>";
  }
}

function renderPrepTime(prepTime) {
  const prepTimeEl = document.getElementById("cooking-prep-time");
  if (!prepTimeEl) return;

  if (typeof prepTime === "number" && prepTime > 0) {
    prepTimeEl.textContent = `${prepTime} phút`;
    return;
  }

  prepTimeEl.textContent = "Chưa rõ";
}

function renderCookingSteps(steps) {
  const listContainer = document.getElementById("cooking-steps-list");
  if (!listContainer) return;
  
  let html = "";
  steps.forEach(step => {
    let lis = step.instructions.map(inst => `<li>${inst}</li>`).join("");
    html += `
      <div class="step-item">
        <div class="step-number">${step.stepNumber}</div>
        <div class="step-content-detail">
          <div class="step-title">${step.title}</div>
          <ul class="step-instructions">
            ${lis}
          </ul>
        </div>
      </div>
    `;
  });
  listContainer.innerHTML = html;
}

function initCookingStepsDetail() {
  const container = document.querySelector(".cooking-steps-container");
  if (!container) return; // Không ở trang này

  // Load data từ localStorage giống màn Recipe Detail
  const savedData = localStorage.getItem("sakedo_selected_recipe");
  let stepsToRender = defaultRecipeSteps;
  let ingredientData = { available: [], missing: [] };
  let prepTime = null;

  if (savedData) {
    try {
      const savedObj = JSON.parse(savedData);
      const { title, img, steps, ingredients, prepTime: recipePrepTime } = savedObj;
      const titleEl = document.getElementById("cooking-recipe-title");
      const imgEl = document.getElementById("cooking-recipe-img");
      
      if (titleEl && title) titleEl.innerText = title;
      if (imgEl && img) imgEl.src = img;

      if (steps && steps.length > 0) {
        stepsToRender = steps;
      }

      ingredientData = ingredients || ingredientData;
      prepTime = recipePrepTime || null;
    } catch (e) {
      console.error("Lỗi parse data món ăn:", e);
    }
  }

  renderPrepTime(prepTime);
  renderCookingIngredients(ingredientData);

  // Khởi tạo các bước nấu (Ở đây có thể gọi API AI để lấy steps động nếu muốn)
  // Rendering the dynamic steps we got from chat.js
  renderCookingSteps(stepsToRender);
}

document.addEventListener("pageChanged", (e) => {
  if (e.detail.page === "cooking-steps") {
    initCookingStepsDetail();
  }
});
