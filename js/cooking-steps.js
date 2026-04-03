// js/cooking-steps.js

function finishCooking() {
  if (typeof window.showToast === "function") {
    window.showToast("Chúc mừng bạn đã hoàn thành món ăn!", "success");
  } else {
    alert("Nấu ăn hoàn tất!");
  }
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

  if (savedData) {
    try {
      const savedObj = JSON.parse(savedData);
      const { title, img, steps } = savedObj;
      const titleEl = document.getElementById("cooking-recipe-title");
      const imgEl = document.getElementById("cooking-recipe-img");
      
      if (titleEl && title) titleEl.innerText = title;
      if (imgEl && img) imgEl.src = img;

      if (steps && steps.length > 0) {
        stepsToRender = steps;
      }
    } catch (e) {
      console.error("Lỗi parse data món ăn:", e);
    }
  }

  // Khởi tạo các bước nấu (Ở đây có thể gọi API AI để lấy steps động nếu muốn)
  // Rendering the dynamic steps we got from chat.js
  renderCookingSteps(stepsToRender);
}

// Lắng nghe MutationObserver 
const appRootSteps = document.getElementById("app-root");
if (appRootSteps) {
  const observer = new MutationObserver((mutations) => {
    for (let m of mutations) {
      if (m.addedNodes.length > 0) {
        initCookingStepsDetail();
      }
    }
  });
  observer.observe(appRootSteps, { childList: true });
} else {
  document.addEventListener("DOMContentLoaded", initCookingStepsDetail);
}
