(function () {
  const resultList = document.getElementById("result-list");
  const emptyState = document.getElementById("scan-empty-state");
  const messageEl = document.getElementById("scan-result-message");
  const btnComplete = document.getElementById("btn-complete");

  const modal = document.getElementById("delete-modal");
  const modalCancel = document.getElementById("modal-cancel");
  const modalConfirm = document.getElementById("modal-confirm");

  let itemToDeleteId = null;
  let detections = [];

  function showMessage(message, isError = false) {
    if (!messageEl) return;
    messageEl.textContent = message || "";
    messageEl.classList.toggle("error", Boolean(isError));
  }

  function toDateInputValue(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }

  function getDefaultExpiry() {
    const date = new Date();
    date.setDate(date.getDate() + 7);
    return toDateInputValue(date);
  }

  function normalizeDetections(rawItems) {
    return rawItems
      .filter((item) => item && item.name)
      .map((item, idx) => ({
        id: `${item.name}-${idx}-${Date.now()}`,
        name: String(item.name).trim(),
        quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
        confidence: Number(item.confidence) || 0,
        category: item.category || getCategoryByName(String(item.name).trim()),
        image_url: item.image_url || "",
        expiry_date: getDefaultExpiry(),
        selected: true
      }));
  }

  function getFallbackImageByCategory(category) {
    const mapping = {
      milk: "assets/images/milk.png",
      thit: "assets/images/thit.png",
      traicay: "assets/images/traicay.png",
      douong: "assets/images/douong.png",
      khac: "assets/images/khac.png"
    };
    return mapping[category] || mapping.khac;
  }

  function getCategoryByName(name) {
    const text = name.toLowerCase();
    if (text.includes("sua") || text.includes("milk") || text.includes("cheese")) return "milk";
    if (text.includes("thit") || text.includes("ca") || text.includes("hai san")) return "thit";
    if (text.includes("rau") || text.includes("qua") || text.includes("fruit") || text.includes("vegetable")) return "traicay";
    if (text.includes("nuoc") || text.includes("drink")) return "douong";
    return "khac";
  }

  function getCategoryLabel(category) {
    const mapping = {
      milk: "Sữa và phô mai",
      thit: "Thịt và hải sản",
      traicay: "Rau và trái cây",
      douong: "Đồ uống",
      khac: "Khác"
    };
    return mapping[category] || mapping.khac;
  }

  function renderList() {
    if (!resultList || !emptyState) return;

    if (!detections.length) {
      resultList.innerHTML = "";
      emptyState.style.display = "grid";
      btnComplete.disabled = true;
      return;
    }

    emptyState.style.display = "none";
    btnComplete.disabled = false;

    resultList.innerHTML = detections.map((item) => `
      <div class="result-item" data-id="${item.id}">
        <label class="result-checkbox">
          <input type="checkbox" ${item.selected ? "checked" : ""} data-action="toggle" data-id="${item.id}" />
          <span class="checkmark"></span>
        </label>

        <div class="result-thumbnail">
          <img src="${item.image_url || getFallbackImageByCategory(item.category)}" alt="${item.name}" onerror="this.onerror=null;this.src='assets/images/khac.png';" />
        </div>

        <div class="result-main">
          <span class="result-name">${item.name}</span>
          <span class="result-sub">Số lượng tự động: ${item.quantity} | Độ tin cậy: ${(item.confidence * 100).toFixed(1)}%</span>
          <div class="result-expiry">
            <label>Hạn dùng</label>
            <input type="date" data-action="expiry" data-id="${item.id}" value="${item.expiry_date}" />
          </div>
        </div>

        <div class="result-actions">
          <button class="btn-delete-item" title="Xóa" data-action="delete" data-id="${item.id}"><i class="fa-solid fa-xmark"></i></button>
        </div>
      </div>
    `).join("");
  }

  function readFromSession() {
    const raw = sessionStorage.getItem("sakedo_scan_detections") || "[]";
    const parsed = JSON.parse(raw);
    detections = normalizeDetections(Array.isArray(parsed) ? parsed : []);
    renderList();
  }

  function openDeleteModal(itemId) {
    itemToDeleteId = itemId;
    modal?.classList.add("active");
  }

  function closeDeleteModal() {
    itemToDeleteId = null;
    modal?.classList.remove("active");
  }

  async function saveToBackend() {
    const selectedItems = detections.filter((item) => item.selected);

    if (!selectedItems.length) {
      showMessage("Hãy chọn ít nhất 1 sản phẩm để thêm vào tủ lạnh.", true);
      return;
    }

    const missingExpiry = selectedItems.find((item) => !item.expiry_date);
    if (missingExpiry) {
      showMessage(`Vui lòng nhập hạn dùng cho ${missingExpiry.name}.`, true);
      return;
    }

    const payload = {
      items: selectedItems.map((item) => ({
        name: item.name,
        quantity: item.quantity,
        expiry_date: item.expiry_date,
        location: "tulanh",
        category: item.category || getCategoryByName(item.name),
        image_url: item.image_url || getFallbackImageByCategory(item.category || getCategoryByName(item.name))
      }))
    };

    try {
      showMessage("Đang lưu sản phẩm vào tủ lạnh...");
      const response = await window.sakedoApi.saveScannedItems(payload);
      showMessage(`Đã thêm vào tủ lạnh thành công (${response?.inserted_or_updated || selectedItems.length} sản phẩm).`);

      sessionStorage.removeItem("sakedo_scan_detections");
      setTimeout(() => {
        navigate("fridge", document.querySelectorAll(".nav-item")[1]);
      }, 550);
    } catch (error) {
      showMessage(error.message || "Không thể lưu sản phẩm vào tủ lạnh.", true);
    }
  }

  resultList?.addEventListener("input", (event) => {
    const target = event.target;
    const itemId = target.dataset.id;
    const action = target.dataset.action;
    const item = detections.find((d) => d.id === itemId);
    if (!item) return;

    if (action === "toggle") {
      item.selected = Boolean(target.checked);
      return;
    }

    if (action === "expiry") {
      item.expiry_date = target.value;
    }
  });

  resultList?.addEventListener("click", (event) => {
    const btn = event.target.closest("button[data-action='delete']");
    if (!btn) return;
    openDeleteModal(btn.dataset.id);
  });

  modalCancel?.addEventListener("click", closeDeleteModal);
  modal?.addEventListener("click", (event) => {
    if (event.target === modal) closeDeleteModal();
  });
  modalConfirm?.addEventListener("click", () => {
    if (itemToDeleteId) {
      detections = detections.filter((item) => item.id !== itemToDeleteId);
      renderList();
    }
    closeDeleteModal();
  });

  btnComplete?.addEventListener("click", saveToBackend);

  readFromSession();
})();
