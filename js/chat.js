// js/chat.js

let aiSuggestedFoods = [];
let cachedFridgeItems = [];

const RECIPE_TEMPLATES = [
  {
    name: "Trứng chiên cà",
    img: "assets/img/trungchien.png",
    keywords: ["trung", "ca chua"],
    required: ["trung", "ca chua", "hanh"],
    steps: [
      {
        stepNumber: 1,
        title: "SƠ CHẾ NGUYÊN LIỆU",
        instructions: [
          "Làm sạch trứng và cà chua, thái nhỏ cà chua.",
          "Sơ chế hành lá, giữ lại phần đầu hành để phi thơm."
        ]
      },
      {
        stepNumber: 2,
        title: "CHẾ BIẾN",
        instructions: [
          "Phi thơm hành, xào cà chua đến khi mềm.",
          "Đổ trứng vào, đảo nhẹ đến khi trứng vừa chín tới."
        ]
      },
      {
        stepNumber: 3,
        title: "HOÀN THIỆN",
        instructions: ["Nêm nếm vừa ăn, rắc thêm hành lá và dùng nóng."]
      }
    ]
  },
  {
    name: "Canh chua cá",
    img: "assets/img/canhchua.png",
    keywords: ["ca", "ca chua", "thom", "khom"],
    required: ["ca", "ca chua", "khom"],
    steps: [
      {
        stepNumber: 1,
        title: "SƠ CHẾ",
        instructions: [
          "Sơ chế cá sạch sẽ, cắt khúc vừa ăn.",
          "Cà chua và thơm rửa sạch, cắt miếng."
        ]
      },
      {
        stepNumber: 2,
        title: "NẤU CANH",
        instructions: [
          "Nấu nước sôi, cho cá vào nấu chín.",
          "Thêm cà chua và thơm, nêm nếm vừa miệng."
        ]
      },
      {
        stepNumber: 3,
        title: "HOÀN THIỆN",
        instructions: ["Nêm lại vị chua mặn ngọt, dùng nóng."]
      }
    ]
  },
  {
    name: "Rau xào tỏi",
    img: "assets/images/traicay.png",
    keywords: ["rau", "cai", "bo xoi", "cai thia", "cai ngot"],
    required: ["rau", "toi"],
    steps: [
      {
        stepNumber: 1,
        title: "SƠ CHẾ",
        instructions: ["Rửa sạch rau, để ráo nước.", "Băm nhỏ tỏi."]
      },
      {
        stepNumber: 2,
        title: "XÀO",
        instructions: ["Phi thơm tỏi, cho rau vào đảo nhanh tay.", "Nêm muối, hạt nêm vừa ăn."]
      },
      {
        stepNumber: 3,
        title: "HOÀN THIỆN",
        instructions: ["Dùng nóng, rau giữ được độ giòn." ]
      }
    ]
  }
];

const normalizeText = (value) =>
  (value || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();

const buildInventory = (items) => {
  const normalized = items.map((item) => ({
    name: item.name || "",
    quantity: Number(item.quantity) || 1,
    normalizedName: normalizeText(item.name)
  }));

  const keywordSet = new Set();
  normalized.forEach((item) => {
    item.normalizedName.split(/\s+/).forEach((token) => {
      if (token) keywordSet.add(token);
    });
  });

  return { normalized, keywordSet };
};

const formatWeight = (quantity) => `${quantity || 1} phần`;

const buildIngredients = (items, requiredKeywords) => {
  const available = [];
  const missing = [];

  const requiredSet = new Set(requiredKeywords.map((keyword) => normalizeText(keyword)));
  const matchedKeywords = new Set();

  items.forEach((item) => {
    requiredSet.forEach((keyword) => {
      if (item.normalizedName.includes(keyword)) {
        matchedKeywords.add(keyword);
        available.push({
          name: item.name,
          weight: formatWeight(item.quantity)
        });
      }
    });
  });

  requiredSet.forEach((keyword) => {
    if (!matchedKeywords.has(keyword)) {
      missing.push({
        name: keyword,
        weight: "1 phần"
      });
    }
  });

  return { available, missing };
};

const buildFallbackSuggestion = (items) => {
  const topItems = items.slice(0, 3);
  const title = topItems.length
    ? `Món từ ${topItems.map((item) => item.name).join(", ")}`
    : "Món tổng hợp từ tủ lạnh";

  return {
    name: title,
    img: "assets/images/khac.png",
    ingredients: {
      available: topItems.map((item) => ({
        name: item.name,
        weight: formatWeight(item.quantity)
      })),
      missing: []
    },
    steps: [
      {
        stepNumber: 1,
        title: "SƠ CHẾ",
        instructions: ["Sơ chế các nguyên liệu đang có, rửa sạch và thái vừa ăn."]
      },
      {
        stepNumber: 2,
        title: "CHẾ BIẾN",
        instructions: ["Kết hợp các nguyên liệu theo kiểu xào hoặc nấu canh nhanh."]
      },
      {
        stepNumber: 3,
        title: "HOÀN THIỆN",
        instructions: ["Nêm nếm vừa ăn và thưởng thức ngay khi còn nóng."]
      }
    ]
  };
};

const buildSuggestions = (items) => {
  const { normalized, keywordSet } = buildInventory(items);

  const scoredTemplates = RECIPE_TEMPLATES.map((template) => {
    const score = template.keywords.reduce((total, keyword) => {
      return keywordSet.has(normalizeText(keyword)) ? total + 1 : total;
    }, 0);

    return { template, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);

  const suggestions = scoredTemplates.map(({ template }) => {
    return {
      name: template.name,
      img: template.img,
      ingredients: buildIngredients(normalized, template.required),
      steps: template.steps
    };
  });

  if (!suggestions.length && normalized.length) {
    suggestions.push(buildFallbackSuggestion(normalized));
  }

  return suggestions;
};

const fetchAiSuggestions = async (items) => {
  if (!window.sakedoApi) return [];
  const auth = window.sakedoApi.getStoredAuth();
  if (!auth?.access_token) return [];

  try {
    const response = await window.sakedoApi.suggestRecipes({ items });
    return Array.isArray(response?.recipes) ? response.recipes : [];
  } catch (error) {
    return [];
  }
};

const renderSuggestion = (index) => {
  if (!aiSuggestedFoods.length) return;
  const foodState = document.getElementById("state-food-suggestion");
  const foodImage = document.getElementById("food-preview-img");
  const foodTitle = document.getElementById("food-preview-title");

  if (!foodState || !foodImage || !foodTitle) return;

  const safeIndex = ((index % aiSuggestedFoods.length) + aiSuggestedFoods.length) % aiSuggestedFoods.length;
  foodState.dataset.currentIndex = safeIndex;

  foodImage.style.opacity = "0";
  setTimeout(() => {
    foodImage.src = aiSuggestedFoods[safeIndex].img;
    foodTitle.innerText = aiSuggestedFoods[safeIndex].name;
    foodImage.style.opacity = "1";
  }, 150);
};

const toggleSuggestionState = (showSuggestions) => {
  const welcomeState = document.getElementById("state-welcome");
  const foodState = document.getElementById("state-food-suggestion");
  const btnRecipe = document.querySelector(".btn-recipe");

  if (!welcomeState || !foodState || !btnRecipe) return;

  if (showSuggestions) {
    welcomeState.classList.add("hidden");
    foodState.classList.remove("hidden");
    btnRecipe.removeAttribute("disabled");
  } else {
    welcomeState.classList.remove("hidden");
    foodState.classList.add("hidden");
    btnRecipe.setAttribute("disabled", "disabled");
  }
};

const loadFridgeItems = async () => {
  if (!window.sakedoApi) return [];
  const auth = window.sakedoApi.getStoredAuth();
  if (!auth?.access_token) return [];
  try {
    return await window.sakedoApi.getFridgeItems();
  } catch (error) {
    return [];
  }
};

const initAiSuggestions = async ({ showToast = false } = {}) => {
  cachedFridgeItems = await loadFridgeItems();

  // Thử gọi AI trước
  const aiResults = await fetchAiSuggestions(cachedFridgeItems);

  if (aiResults.length) {
    // ✅ AI thành công
    aiSuggestedFoods = aiResults;
  } else if (cachedFridgeItems.length) {
    // ✅ Fallback: dùng logic local với RECIPE_TEMPLATES
    aiSuggestedFoods = buildSuggestions(cachedFridgeItems);
    if (showToast && typeof window.showToast === "function") {
      window.showToast("Đang dùng gợi ý thông minh từ tủ lạnh của bạn 🥘", "info");
    }
  } else {
    // Tủ lạnh trống
    aiSuggestedFoods = [];
  }

  if (!aiSuggestedFoods.length) {
    toggleSuggestionState(false);
    return;
  }

  toggleSuggestionState(true);
  renderSuggestion(0);
};

document.addEventListener("click", function (e) {
  // Bấm nút làm mới
  if (e.target.closest(".btn-refresh")) {
		initAiSuggestions({ showToast: true }).then(() => {
			if (aiSuggestedFoods.length > 1) {
				const btnRight = document.querySelector(".btn-arrow.right");
				if (btnRight) btnRight.click();
			}
		});
  }

  // Bấm mũi tên Trái/Phải
  if (e.target.closest(".btn-arrow.left") || e.target.closest(".btn-arrow.right")) {
    if (!aiSuggestedFoods.length) return;
    const isNext = e.target.closest(".btn-arrow.right") ? 1 : -1;
    const foodState = document.getElementById("state-food-suggestion");
    const foodImage = document.getElementById("food-preview-img");
    const foodTitle = document.getElementById("food-preview-title");

    let currentIdx = parseInt(foodState.dataset.currentIndex || 0);
    currentIdx = (currentIdx + isNext + aiSuggestedFoods.length) % aiSuggestedFoods.length;
    foodState.dataset.currentIndex = currentIdx;

    foodImage.style.opacity = "0";
    setTimeout(() => {
      foodImage.src = aiSuggestedFoods[currentIdx].img;
      foodTitle.innerText = aiSuggestedFoods[currentIdx].name;
      foodImage.style.opacity = "1";
    }, 150);
  }

  // Xử lý báo thao tác Công thức hoặc nhấn vào hình ảnh món ăn
  const isRecipeBtn = e.target.closest(".btn-recipe");
  const isFoodImg = e.target.closest("#food-preview-img");
  
  if (isRecipeBtn || isFoodImg) {
    const btnRecipe = document.querySelector(".btn-recipe");
    if (btnRecipe && !btnRecipe.hasAttribute("disabled") && aiSuggestedFoods.length) {
      if (typeof window.showToast === "function") {
        window.showToast("Đang mở chi tiết công thức...", "success");
      }
      
      const foodState = document.getElementById("state-food-suggestion");
      let currentIdx = parseInt(foodState?.dataset?.currentIndex || 0);

      const currentTitle = document.getElementById("food-preview-title")?.innerText || "";
      let recipeData = aiSuggestedFoods.find(f => currentTitle.includes(f.name)) || aiSuggestedFoods[currentIdx];

      localStorage.setItem("sakedo_selected_recipe", JSON.stringify({ 
        title: recipeData.name, 
        img: recipeData.img,
        ingredients: recipeData.ingredients,
        steps: recipeData.steps
      }));

      setTimeout(() => {
        if (typeof navigate === "function") {
          navigate('recipe-detail');
        }
      }, 300);
    }
  }
});

document.addEventListener("pageChanged", (event) => {
  if (event.detail.page === "ai-chat") {
    initAiSuggestions();
  }
});

