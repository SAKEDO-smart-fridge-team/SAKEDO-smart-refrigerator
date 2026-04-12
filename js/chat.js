// js/chat.js  –  Mr. Chè AI suggestion engine

// ─────────────────────────────────────────────
// 1. STATE
// ─────────────────────────────────────────────
let aiSuggestedFoods = [];
let cachedFridgeItems = [];
let currentMode = null;

// ─────────────────────────────────────────────
// 2. MODE CONFIG
// ─────────────────────────────────────────────
const MODES = {
  gan_het_han: {
    label: "⏰ Gần hết hạn",
    color: "#f97316",
    bgColor: "#fff7ed",
    subtitle: "Ưu tiên nguyên liệu sắp hết hạn"
  },
  giam_can: {
    label: "🥗 Giảm cân",
    color: "#22c55e",
    bgColor: "#f0fdf4",
    subtitle: "Món ít calo, nhiều rau xanh"
  },
  nau_nhanh: {
    label: "⚡ Nấu nhanh",
    color: "#eab308",
    bgColor: "#fefce8",
    subtitle: "Dưới 20 phút là xong"
  },
  tang_co: {
    label: "💪 Bổ protein",
    color: "#3b82f6",
    bgColor: "#eff6ff",
    subtitle: "Giàu đạm từ thịt, cá, trứng"
  },
  thuan_chay: {
    label: "🌿 Thuần chay",
    color: "#10b981",
    bgColor: "#ecfdf5",
    subtitle: "Không thịt, không hải sản"
  },
  ngau_nhien: {
    label: "🎲 Ngẫu nhiên",
    color: "#8b5cf6",
    bgColor: "#f5f3ff",
    subtitle: "Bất ngờ từ tủ lạnh của bạn"
  }
};

// ─────────────────────────────────────────────
// 3. RECIPE DATABASE & ENGINE — từ recipe-engine.js (shared)
// ─────────────────────────────────────────────
// Lazy-init: đọc từ window.recipeEngine lúc cần, tránh crash khi script load
// Dùng prefix _re_ để tránh conflict với các hàm cùng tên ở main.js, fridge.js...
function _re() {
  return window.recipeEngine || {};
}
function _re_templates()         { return _re().RECIPE_TEMPLATES || []; }
function _re_buildInventory()    { return (_re().buildInventory || (() => ({ normalized: [], keywordSet: new Set() }))).apply(null, arguments); }
function _re_getExpiringItems()  { return (_re().getExpiringItems || (() => [])).apply(null, arguments); }
function _re_scoreTemplate()     { return (_re().scoreTemplate || (() => 0)).apply(null, arguments); }
function _re_buildSuggestions()  { return (_re().buildSuggestionsByMode || (() => [])).apply(null, arguments); }

// ─────────────────────────────────────────────
// 6. UI STATE MANAGEMENT
// ─────────────────────────────────────────────

const setChatState = (state) => {
  const stateIds = ["state-mode-select", "state-loading", "state-food-suggestion", "state-empty"];
  stateIds.forEach((id) => {
    const el = document.getElementById(id);
    if (el) el.classList.add("hidden");
  });

  const btnRecipe = document.querySelector(".btn-recipe");
  const btnMissing = document.querySelector(".btn-missing");
  const btnRefresh = document.getElementById("btn-refresh-recipe");
  const btnBack = document.getElementById("btn-back-mode");
  const actionGroup = document.getElementById("recipe-action-group");

  if (btnMissing) { btnMissing.classList.add("hidden"); btnMissing.setAttribute("disabled", ""); }
  if (btnRecipe) btnRecipe.setAttribute("disabled", "");
  if (btnRefresh) btnRefresh.style.display = "none";
  if (btnBack) btnBack.style.display = "none";
  if (actionGroup) actionGroup.style.display = "none";

  const target = document.getElementById(`state-${state === "mode" ? "mode-select" : state === "food" ? "food-suggestion" : state === "empty" ? "empty" : "loading"}`);
  if (target) target.classList.remove("hidden");

  if (state === "food") {
    if (btnRecipe) btnRecipe.removeAttribute("disabled");
    if (btnRefresh) btnRefresh.style.display = "flex";
    if (btnBack) btnBack.style.display = "flex";
    if (actionGroup) actionGroup.style.display = "flex";
  }
  if (state === "empty") {
    if (btnBack) btnBack.style.display = "flex";
  }
};

const updateSubtitle = (text) => {
  const el = document.getElementById("ai-subtitle");
  if (el) el.textContent = text;
};

const updateModeBadge = (mode) => {
  const badge = document.getElementById("food-mode-badge");
  if (!badge) return;
  const cfg = MODES[mode];
  if (!cfg) { badge.classList.add("hidden"); return; }
  badge.textContent = cfg.label;
  badge.style.background = cfg.bgColor;
  badge.style.color = cfg.color;
  badge.style.borderColor = cfg.color + "40";
  badge.classList.remove("hidden");
};

const updateMissingCta = (recipe) => {
  const btnMissing = document.querySelector(".btn-missing");
  const missingText = document.getElementById("missing-cta-text");
  if (!btnMissing || !missingText) return;

  const missingList = recipe?.ingredients?.missing || [];
  if (!missingList.length) {
    btnMissing.classList.add("hidden");
    btnMissing.setAttribute("disabled", "");
    return;
  }

  missingText.textContent = `Cần mua ${missingList.length} nguyên liệu`;
  btnMissing.classList.remove("hidden");
  btnMissing.removeAttribute("disabled");
  btnMissing.dataset.query = missingList.map((i) => i.name).filter(Boolean).join(" ");
};

const renderSuggestion = (index) => {
  if (!aiSuggestedFoods.length) return;

  const foodState = document.getElementById("state-food-suggestion");
  const foodImage = document.getElementById("food-preview-img");
  const foodTitle = document.getElementById("food-preview-title");
  const availBadge = document.getElementById("food-availability-badge");
  const counterCurrent = document.getElementById("food-counter-current");
  const counterTotal = document.getElementById("food-counter-total");
  const preptimeEl = document.getElementById("food-preptime");
  const preptimeVal = document.getElementById("food-preptime-val");

  if (!foodState || !foodImage || !foodTitle) return;

  const safeIdx = ((index % aiSuggestedFoods.length) + aiSuggestedFoods.length) % aiSuggestedFoods.length;
  const recipe = aiSuggestedFoods[safeIdx];
  foodState.dataset.currentIndex = safeIdx;

  // Availability badge
  const have = recipe?.ingredients?.available?.length || 0;
  const lack = recipe?.ingredients?.missing?.length || 0;
  const total = have + lack;
  if (availBadge) {
    if (total > 0) {
      availBadge.textContent = `${have}/${total} nguyên liệu có sẵn`;
      availBadge.className = `food-availability-badge ${have === total ? "badge-full" : ""}`;
    } else {
      availBadge.className = "food-availability-badge hidden";
    }
  }

  // Prep time badge
  if (preptimeEl && preptimeVal) {
    if (recipe.prepTime) {
      preptimeVal.textContent = recipe.prepTime;
      preptimeEl.classList.remove("hidden");
    } else {
      preptimeEl.classList.add("hidden");
    }
  }

  // Mode badge
  updateModeBadge(currentMode);

  // Counter
  if (counterCurrent) counterCurrent.textContent = safeIdx + 1;
  if (counterTotal) counterTotal.textContent = aiSuggestedFoods.length;

  // Animate swap
  foodImage.style.opacity = "0";
  foodImage.style.transform = "scale(0.97)";
  setTimeout(() => {
    foodImage.src = recipe.img || "assets/images/khac.png";
    foodImage.onerror = () => { foodImage.src = "assets/images/khac.png"; };
    foodTitle.innerText = recipe.name;
    foodImage.style.opacity = "1";
    foodImage.style.transform = "scale(1)";
  }, 160);

  updateMissingCta(recipe);
};

// ─────────────────────────────────────────────
// 7. CORE LOGIC
// ─────────────────────────────────────────────

const loadFridgeItems = async () => {
  if (!window.sakedoApi) return [];
  const auth = window.sakedoApi.getStoredAuth();
  if (!auth?.access_token) return [];
  try {
    return await window.sakedoApi.getFridgeItems();
  } catch {
    return [];
  }
};

// Cập nhật badge số món available cho từng mode chip
const updateModeChipCounts = (items) => {
  const { keywordSet } = items.length ? _re_buildInventory(items) : { keywordSet: new Set() };

  document.querySelectorAll(".mode-chip[data-mode]").forEach((chip) => {
    const mode = chip.dataset.mode;
    if (!mode || mode === "gan_het_han" || mode === "ngau_nhien") return;

    const filtered = _re_templates().filter((t) => t.tags && t.tags.includes(mode));
    const availableCount = filtered.filter((t) => _re_scoreTemplate(t, keywordSet) > 0).length;

    let countEl = chip.querySelector(".mode-chip-count");
    if (!countEl) {
      countEl = document.createElement("span");
      countEl.className = "mode-chip-count";
      const content = chip.querySelector(".mode-chip-content");
      if (content) content.appendChild(countEl);
    }
    if (availableCount > 0) {
      countEl.textContent = `${availableCount}/${filtered.length} món có sẵn`;
      countEl.classList.add("has-match");
      countEl.style.display = "";
    } else {
      countEl.style.display = "none";
    }
  });

  // Expiry chip badge
  const expiringItems = _re_getExpiringItems(items, 7);
  const expiringChip = document.querySelector('[data-mode="gan_het_han"]');
  if (expiringChip) {
    let badge = expiringChip.querySelector(".mode-chip-badge");
    if (expiringItems.length > 0) {
      if (!badge) {
        badge = document.createElement("span");
        badge.className = "mode-chip-badge";
        expiringChip.appendChild(badge);
      }
      badge.textContent = expiringItems.length;
    } else if (badge) {
      badge.remove();
    }
  }
};

const initModeSelector = async () => {
  setChatState("mode");
  updateSubtitle("Tương tác trực tuyến");
  currentMode = null;

  // Gắn onclick trực tiếp vào từng mode chip — đảm bảo click luôn hoạt động
  const chips = document.querySelectorAll(".mode-chip[data-mode]");
  chips.forEach((chip) => {
    chip.onclick = null; // xóa handler cũ tránh trùng lặp
    chip.onclick = () => {
      const mode = chip.dataset.mode;
      if (!mode) return;
      document.querySelectorAll(".mode-chip").forEach((c) => c.classList.remove("selected"));
      chip.classList.add("selected");
      initAiSuggestions(mode);
    };
  });

  // Nút back về mode selector
  const btnBack = document.getElementById("btn-back-mode");
  const btnEmptyChange = document.getElementById("btn-empty-change");
  if (btnBack) btnBack.onclick = () => initModeSelector();
  if (btnEmptyChange) btnEmptyChange.onclick = () => initModeSelector();

  // Nút refresh
  const btnRefresh = document.getElementById("btn-refresh-recipe");
  if (btnRefresh) {
    btnRefresh.onclick = () => {
      if (!currentMode) return;
      btnRefresh.style.transform = "rotate(360deg)";
      setTimeout(() => { btnRefresh.style.transform = ""; }, 400);
      initAiSuggestions(currentMode).then(() => {
        if (aiSuggestedFoods.length > 1) {
          renderSuggestion(Math.floor(Math.random() * aiSuggestedFoods.length));
        }
      });
    };
  }

  // Pre-load fridge items in background while user picks mode → update chip counts
  loadFridgeItems().then((items) => {
    cachedFridgeItems = items;
    updateModeChipCounts(items);
  });
};

const initAiSuggestions = async (mode) => {
  currentMode = mode;
  const cfg = MODES[mode] || {};

  setChatState("loading");
  updateSubtitle(`Đang tìm món: ${cfg.label || mode}...`);

  // Ensure fresh fridge data
  cachedFridgeItems = await loadFridgeItems();

  let suggestions = [];

  // Try backend AI first (if available)
  if (window.sakedoApi) {
    try {
      const auth = window.sakedoApi.getStoredAuth();
      if (auth?.access_token) {
        const aiResp = await window.sakedoApi.suggestRecipes({
          items: cachedFridgeItems,
          mode: mode
        });
        const aiList = Array.isArray(aiResp?.recipes) ? aiResp.recipes : [];
        if (aiList.length) suggestions = aiList;
      }
    } catch {
      // Silently fall through to local engine
    }
  }

  // Local engine as fallback (only when fridge has items)
  // When fridge is empty, do NOT use local engine — it returns all templates with
  // everything in "missing", which is misleading. Show empty state instead.
  if (!suggestions.length && cachedFridgeItems.length > 0) {
    suggestions = _re_buildSuggestions(cachedFridgeItems, mode);
  }

  aiSuggestedFoods = suggestions;

  if (!aiSuggestedFoods.length || cachedFridgeItems.length === 0) {
    setChatState("empty");
    const emptyMsg = cachedFridgeItems.length === 0
      ? "Tủ lạnh đang trống – hãy thêm thực phẩm trước nhé!"
      : (cfg.subtitle || "Không tìm thấy món phù hợp");
    updateSubtitle(emptyMsg);
    // Update the empty-state description text based on context
    const emptyDesc = document.querySelector("#state-empty .empty-desc");
    if (emptyDesc) {
      emptyDesc.innerHTML = cachedFridgeItems.length === 0
        ? "Tủ lạnh chưa có thực phẩm nào.<br />Hãy quét hoặc thêm thực phẩm vào tủ trước nhé!"
        : "Tủ lạnh chưa có đủ nguyên liệu cho chế độ này.<br />Hãy thêm thực phẩm hoặc thử chế độ khác nhé!";
    }
    return;
  }

  setChatState("food");
  updateSubtitle(cfg.subtitle || "Gợi ý từ tủ lạnh của bạn");
  renderSuggestion(0);
  _bindFoodStateHandlers();
};

function _bindFoodStateHandlers() {
  const foodState = document.getElementById("state-food-suggestion");

  // Mũi tên điều hướng
  const btnLeft = document.querySelector(".btn-arrow.left");
  const btnRight = document.querySelector(".btn-arrow.right");
  if (btnLeft) btnLeft.onclick = () => {
    const idx = parseInt(foodState?.dataset.currentIndex || "0");
    renderSuggestion((idx - 1 + aiSuggestedFoods.length) % aiSuggestedFoods.length);
  };
  if (btnRight) btnRight.onclick = () => {
    const idx = parseInt(foodState?.dataset.currentIndex || "0");
    renderSuggestion((idx + 1) % aiSuggestedFoods.length);
  };

  // Ảnh món ăn → mở công thức
  const foodImg = document.getElementById("food-preview-img");
  if (foodImg) foodImg.onclick = () => _openRecipeDetail();

  // Nút Công thức
  const btnRecipe = document.querySelector(".btn-recipe");
  if (btnRecipe) btnRecipe.onclick = () => _openRecipeDetail();

  // Nút Cần mua
  const btnMissing = document.querySelector(".btn-missing");
  if (btnMissing) btnMissing.onclick = () => {
    const query = (btnMissing.dataset.query || "").trim();
    if (query) window.open(`https://www.google.com/search?q=${encodeURIComponent("mua " + query)}`, "_blank", "noopener,noreferrer");
  };
}

function _openRecipeDetail() {
  const btnRecipe = document.querySelector(".btn-recipe");
  if (btnRecipe && btnRecipe.hasAttribute("disabled")) return;
  const foodState = document.getElementById("state-food-suggestion");
  const idx = parseInt(foodState?.dataset.currentIndex || "0");
  const recipe = aiSuggestedFoods[idx];
  if (!recipe) return;

  localStorage.setItem("sakedo_selected_recipe", JSON.stringify({
    title: recipe.name,
    img: recipe.img,
    ingredients: recipe.ingredients,
    steps: recipe.steps,
    prepTime: recipe.prepTime,
    source: "ai-chat"
  }));

  if (typeof window.showToast === "function") {
    window.showToast("Đang mở công thức...", "success");
  }
  setTimeout(() => {
    if (typeof navigate === "function") navigate("recipe-detail");
  }, 280);
}

// ─────────────────────────────────────────────
// 8. EVENT LISTENERS (page-level — set up via initModeSelector / _bindFoodStateHandlers)
// ─────────────────────────────────────────────
// Tất cả handlers được gắn trực tiếp bằng .onclick trong initModeSelector()
// và _bindFoodStateHandlers() để đảm bảo luôn hoạt động sau mỗi lần navigate.

// ─── Expose ra window để inline onclick trong HTML dùng được ────────────────
window._chatChipClick = (mode) => {
  document.querySelectorAll(".mode-chip").forEach((c) => c.classList.remove("selected"));
  const chip = document.querySelector(`.mode-chip[data-mode="${mode}"]`);
  if (chip) chip.classList.add("selected");
  initAiSuggestions(mode);
};

window._chatBackToMode = () => initModeSelector();

// Page entered
document.addEventListener("pageChanged", (event) => {
  if (event.detail.page === "ai-chat") {
    initModeSelector();
  }
});

