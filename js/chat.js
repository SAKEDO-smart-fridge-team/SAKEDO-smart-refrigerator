// js/chat.js

const aiSuggestedFoods = [
  { 
    name: "Trứng chiên cà", 
    img: "assets/img/trungchien.png",
    ingredients: {
      available: [
        { name: "Trứng gà", weight: "3 quả" },
        { name: "Cà chua", weight: "2 quả" },
        { name: "Hành lá", weight: "10g" }
      ],
      missing: [
        { name: "Nước mắm", weight: "1 muỗng" },
        { name: "Dầu ăn", weight: "2 muỗng" }
      ]
    },
    steps: [
      {
        stepNumber: 1,
        title: "SƠ CHẾ NGUYÊN LIỆU",
        instructions: [
          "Cà chua rửa sạch, thái hạt lựu để nhanh mềm.",
          "Hành lá rửa sạch, đầu hành dập nhuyễn, phần lá thái nhỏ.",
          "Đập trứng ra bát, nêm xíu con ruốc hoặc hạt nêm, nước mắm, tiêu rồi quậy tan đều."
        ]
      },
      {
        stepNumber: 2,
        title: "CHẾ BIẾN",
        instructions: [
          "Làm nóng chảo với 2 muỗng dầu ăn, phi thơm phần đầu hành đập dập.",
          "Cho cà chua vào xào với lửa vừa, thêm chút muối để cà chua mau nhừ tạo màu đẹp.",
          "Khi cà chua đã nhuyễn thành sốt sệt, đổ hỗn hợp trứng vào chảo chiên dàn đều.",
          "Dùng đũa đảo nhẹ tay đến khi trứng vừa chín tới thì tắt bếp ngay để trứng không bị khô."
        ]
      },
      {
        stepNumber: 3,
        title: "HOÀN THIỆN & TRÌNH BÀY",
        instructions: [
          "Trút trứng ra đĩa, rắc phần hành lá thái nhỏ và một ít tiêu đen lên trên.",
          "Yêu cầu thành phẩm: Trứng mềm xốp, chua nhẹ vị cà, thích hợp ăn nóng cùng cơm trắng."
        ]
      }
    ]
  },
  { 
    name: "Canh chua cá lóc", 
    img: "assets/img/canhchua.png",
    ingredients: {
      available: [
        { name: "Cá lóc", weight: "500g" },
        { name: "Bạc hà", weight: "100g" },
        { name: "Cà chua", weight: "2 quả" },
        { name: "Khóm / Thơm", weight: "1 quả" }
      ],
      missing: [
        { name: "Đậu bắp", weight: "3 trái" },
        { name: "Me, rau nêm", weight: "10g" }
      ]
    },
    steps: [
      {
        stepNumber: 1,
        title: "SƠ CHẾ NGUYÊN LIỆU",
        instructions: [
          "Làm sạch cá: Rửa kỹ cá lóc bằng muối hạt và cạo màng đen để khử mùi tanh/hôi.",
          "Cắt thái rau củ: Bạc hà tước vỏ thái xéo, khóm thái lát mỏng, cà chua bổ múi cau, đậu bắp thái xéo.",
          "Ướp gia vị: Ướp cá lóc với 1 muỗng hạt nêm, xíu muối, đường và hành băm trong 15 phút."
        ]
      },
      {
        stepNumber: 2,
        title: "CHẾ BIẾN",
        instructions: [
          "Bắc nồi, phi tỏi thơm vàng rồi vớt ra. Dùng dầu đó xào 1/2 lượng cà chua và khóm để lấy màu.",
          "Đổ 1 lít nước vào đun sôi, thả nhẹ nhàng cá lóc vào đun sôi, hớt bọt thường xuyên để nước trong.",
          "Dầm cốt me chua đổ vào, nêm muối, đường, nước mắm cân chỉnh lại vị chua mặn ngọt vừa miệng."
        ]
      },
      {
        stepNumber: 3,
        title: "HOÀN THIỆN & TRÌNH BÀY",
        instructions: [
          "Cho bạc hà, đậu bắp và nốt 1/2 cà chua vào nồi, đun 2 phút để rau củ giòn.",
          "Tắt bếp, múc canh ra tô. Rắc rau om, rau ngò gai thái nhỏ và trút lượng tỏi phi ban nãy lên mặt.",
          "Yêu cầu thành phẩm: Nước canh sóng sánh trong, cá chín mềm thịt ngọt không bở tanh."
        ]
      }
    ]
  }
];

document.addEventListener("click", function (e) {
  // Bấm nút làm mới
  if (e.target.closest(".btn-refresh")) {
    const welcomeState = document.getElementById("state-welcome");
    const foodState = document.getElementById("state-food-suggestion");
    const btnRecipe = document.querySelector(".btn-recipe");

    if (welcomeState && foodState && btnRecipe) {
      if (!welcomeState.classList.contains("hidden")) {
        welcomeState.classList.add("hidden");
        foodState.classList.remove("hidden");
        btnRecipe.removeAttribute("disabled"); 
      } else {
        const btnRight = document.querySelector(".btn-arrow.right");
        if(btnRight) btnRight.click();
      }
    }
  }

  // Bấm mũi tên Trái/Phải
  if (e.target.closest(".btn-arrow.left") || e.target.closest(".btn-arrow.right")) {
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
    if (btnRecipe && !btnRecipe.hasAttribute("disabled")) {
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

