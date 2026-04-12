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

  // ─── helpers ────────────────────────────────────────────────────────────────

  function escAttr(str) {
    return String(str ?? "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

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

  function getFallbackImageByCategory(category) {
    const map = {
      milk: "assets/images/milk.png",
      thit: "assets/images/thit.png",
      traicay: "assets/images/traicay.png",
      douong: "assets/images/douong.png",
      khac: "assets/images/khac.png"
    };
    return map[(category || "khac").toLowerCase()] || map.khac;
  }

  function getCategoryByName(name) {
    const t = (name || "").toLowerCase();
    if (t.includes("sua") || t.includes("milk") || t.includes("cheese")) return "milk";
    if (t.includes("thit") || t.includes("ca") || t.includes("hai san") || t.includes("tom")) return "thit";
    if (t.includes("rau") || t.includes("qua") || t.includes("fruit") || t.includes("vegetable")) return "traicay";
    if (t.includes("nuoc") || t.includes("drink")) return "douong";
    return "khac";
  }

  // ─── normalize ───────────────────────────────────────────────────────────────

  function normalizeDetections(rawItems) {
    const mapFn = window.applyYoloLabelMap || ((n) => n);

    return rawItems
      .filter((item) => item && item.name)
      .map((item, idx) => {
        const rawName = String(item.name).trim();
        const mappedName = mapFn(rawName);   // ← chuyển không dấu → có dấu
        return {
          id: `${rawName}-${idx}-${Date.now()}`,
          name: mappedName,
          quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
          confidence: Number(item.confidence) || 0,
          category: item.category || getCategoryByName(rawName),
          image_url: item.image_url || "",
          expiry_date: getDefaultExpiry(),
          location: "ngandong",
          selected: true
        };
      });
  }

  // ─── render ──────────────────────────────────────────────────────────────────

  const LOCATION_OPTIONS = [
    { value: "ngandong", label: "Ngăn đá",   icon: "❄️" },
    { value: "nganlanh", label: "Ngăn lạnh", icon: "🌡️" }
  ];

  const CATEGORY_OPTIONS = [
    { value: "milk",    label: "Sữa & Phô mai",    img: "assets/images/milk.png" },
    { value: "thit",    label: "Thịt & Hải sản",   img: "assets/images/thit.png" },
    { value: "traicay", label: "Rau & Trái cây",    img: "assets/images/traicay.png" },
    { value: "douong",  label: "Đồ uống",           img: "assets/images/douong.png" },
    { value: "khac",    label: "Khác",              img: "assets/images/khac.png" }
  ];

  function renderLocationPills(itemId, currentLoc) {
    const safeId = escAttr(itemId);
    return LOCATION_OPTIONS.map((opt) => `
      <button
        type="button"
        class="loc-pill ${currentLoc === opt.value ? "active" : ""}"
        data-action="location"
        data-id="${safeId}"
        data-loc="${opt.value}"
        title="${opt.label}"
      >${opt.icon} ${opt.label}</button>
    `).join("");
  }

  function renderCategoryPills(itemId, currentCat) {
    const safeId = escAttr(itemId);
    return CATEGORY_OPTIONS.map((opt) => `
      <button
        type="button"
        class="cat-pill ${currentCat === opt.value ? "active" : ""}"
        data-action="category"
        data-id="${safeId}"
        data-cat="${opt.value}"
        title="${opt.label}"
      >
        <img src="${opt.img}" alt="${opt.label}" class="cat-pill-img"
          onerror="this.style.display='none'" />
        <span>${opt.label}</span>
      </button>
    `).join("");
  }

  function renderList() {
    if (!resultList || !emptyState) return;

    if (!detections.length) {
      resultList.innerHTML = "";
      emptyState.style.display = "grid";
      if (btnComplete) btnComplete.disabled = true;
      return;
    }

    emptyState.style.display = "none";
    if (btnComplete) btnComplete.disabled = false;

    resultList.innerHTML = detections.map((item) => {
      const imgSrc = item.image_url || getFallbackImageByCategory(item.category);
      const confPct = (item.confidence * 100).toFixed(1);

      return `
        <div class="result-item ${item.selected ? "" : "result-item--deselected"}" data-id="${escAttr(item.id)}">

          <!-- Checkbox -->
          <label class="result-checkbox" title="Chọn / bỏ chọn">
            <input type="checkbox" ${item.selected ? "checked" : ""}
              data-action="toggle" data-id="${escAttr(item.id)}" />
            <span class="checkmark"></span>
          </label>

          <!-- Thumbnail -->
          <div class="result-thumbnail">
            <img src="${escAttr(imgSrc)}" alt="${escAttr(item.name)}"
              onerror="this.onerror=null;this.src='assets/images/khac.png';" />
          </div>

          <!-- Main editable area -->
          <div class="result-main">

            <!-- Row 1: Tên + Số lượng -->
            <div class="result-row-top">
              <input
                type="text"
                class="result-name-input"
                data-action="name"
                data-id="${escAttr(item.id)}"
                value="${escAttr(item.name)}"
                placeholder="Tên thực phẩm"
                title="Chỉnh sửa tên"
              />
              <div class="result-qty-wrap">
                <button type="button" class="btn-qty" data-action="qty-dec" data-id="${escAttr(item.id)}">−</button>
                <input
                  type="number"
                  class="result-qty-input"
                  data-action="qty"
                  data-id="${escAttr(item.id)}"
                  value="${item.quantity}"
                  min="1"
                  max="99"
                />
                <button type="button" class="btn-qty" data-action="qty-inc" data-id="${escAttr(item.id)}">+</button>
              </div>
            </div>

            <!-- Row 2: Độ tin cậy -->
            <span class="result-sub">
              <span class="conf-badge">AI ${confPct}%</span>
              ${(confPct < 60) ? '<span class="conf-warn">⚠ Hãy kiểm tra tên</span>' : ""}
            </span>

            <!-- Row 3: Hạn dùng -->
            <div class="result-expiry">
              <label>Hạn dùng</label>
              <input type="date"
                data-action="expiry"
                data-id="${escAttr(item.id)}"
                value="${escAttr(item.expiry_date)}" />
            </div>

            <!-- Row 4: Vị trí lưu -->
            <div class="result-location">
              <span class="result-location-label">Vị trí:</span>
              <div class="location-pills">
                ${renderLocationPills(item.id, item.location)}
              </div>
            </div>

            <!-- Row 5: Loại thực phẩm -->
            <div class="result-category">
              <span class="result-category-label">Loại:</span>
              <div class="category-pills">
                ${renderCategoryPills(item.id, item.category)}
              </div>
            </div>

          </div>

          <!-- Xóa -->
          <div class="result-actions">
            <button class="btn-delete-item" type="button"
              title="Xóa khỏi danh sách"
              data-action="delete" data-id="${escAttr(item.id)}">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        </div>
      `;
    }).join("");
  }

  // ─── session ─────────────────────────────────────────────────────────────────

  function readFromSession() {
    const raw = sessionStorage.getItem("sakedo_scan_detections") || "[]";
    let parsed;
    try { parsed = JSON.parse(raw); } catch { parsed = []; }
    detections = normalizeDetections(Array.isArray(parsed) ? parsed : []);
    renderList();
  }

  // ─── modal ───────────────────────────────────────────────────────────────────

  function openDeleteModal(itemId) {
    itemToDeleteId = itemId;
    modal?.classList.add("active");
  }

  function closeDeleteModal() {
    itemToDeleteId = null;
    modal?.classList.remove("active");
  }

  // ─── save ────────────────────────────────────────────────────────────────────

  async function saveToBackend() {
    const selectedItems = detections.filter((item) => item.selected);

    if (!selectedItems.length) {
      showMessage("Hãy chọn ít nhất 1 sản phẩm để thêm vào tủ lạnh.", true);
      return;
    }

    // Validate tên không rỗng
    const emptyName = selectedItems.find((item) => !item.name.trim());
    if (emptyName) {
      showMessage("Có sản phẩm chưa nhập tên. Vui lòng điền đầy đủ.", true);
      return;
    }

    const missingExpiry = selectedItems.find((item) => !item.expiry_date);
    if (missingExpiry) {
      showMessage(`Vui lòng nhập hạn dùng cho "${missingExpiry.name}".`, true);
      return;
    }

    const payload = {
      items: selectedItems.map((item) => ({
        name: item.name.trim(),
        quantity: item.quantity,
        expiry_date: item.expiry_date,
        location: item.location || "ngandong",
        category: item.category || getCategoryByName(item.name),
        image_url: item.image_url || getFallbackImageByCategory(item.category || getCategoryByName(item.name))
      }))
    };

    if (btnComplete) btnComplete.disabled = true;
    showMessage("Đang lưu sản phẩm vào tủ lạnh...");

    try {
      const response = await window.sakedoApi.saveScannedItems(payload);
      const count = response?.inserted_or_updated || selectedItems.length;
      showMessage(`Đã thêm ${count} sản phẩm vào tủ lạnh thành công! ✓`);
      sessionStorage.removeItem("sakedo_scan_detections");

      setTimeout(() => {
        // Dùng nav-item fridge (index 1) nếu tồn tại, fallback navigate by name
        const fridgeNavItem = document.querySelectorAll(".nav-item")[1];
        navigate("fridge", fridgeNavItem || null);
      }, 600);
    } catch (error) {
      showMessage(error.message || "Không thể lưu sản phẩm vào tủ lạnh.", true);
      if (btnComplete) btnComplete.disabled = false;
    }
  }

  // ─── event delegation ────────────────────────────────────────────────────────

  // Xử lý input (text/number/date change)
  resultList?.addEventListener("input", (event) => {
    const target = event.target;
    const itemId = target.dataset.id;
    const action = target.dataset.action;
    const item = detections.find((d) => d.id === itemId);
    if (!item) return;

    if (action === "toggle") {
      item.selected = Boolean(target.checked);
      const row = resultList.querySelector(`.result-item[data-id="${itemId}"]`);
      if (row) row.classList.toggle("result-item--deselected", !item.selected);
      return;
    }

    if (action === "name") {
      item.name = target.value;
      return;
    }

    if (action === "qty") {
      const val = parseInt(target.value, 10);
      if (Number.isFinite(val) && val >= 1) {
        item.quantity = Math.min(99, val);
        target.value = item.quantity;
      }
      return;
    }

    if (action === "expiry") {
      item.expiry_date = target.value;
    }
  });

  // Xử lý click (qty +/-, location pills, delete)
  resultList?.addEventListener("click", (event) => {
    const target = event.target.closest("[data-action]");
    if (!target) return;

    const action = target.dataset.action;
    const itemId = target.dataset.id;
    const item = detections.find((d) => d.id === itemId);

    // — xóa item —
    if (action === "delete") {
      openDeleteModal(itemId);
      return;
    }

    if (!item) return;

    // — tăng số lượng —
    if (action === "qty-inc") {
      item.quantity = Math.min(99, item.quantity + 1);
      const qtyInput = resultList.querySelector(`input[data-action="qty"][data-id="${itemId}"]`);
      if (qtyInput) qtyInput.value = item.quantity;
      return;
    }

    // — giảm số lượng —
    if (action === "qty-dec") {
      item.quantity = Math.max(1, item.quantity - 1);
      const qtyInput = resultList.querySelector(`input[data-action="qty"][data-id="${itemId}"]`);
      if (qtyInput) qtyInput.value = item.quantity;
      return;
    }

    // — chọn vị trí lưu —
    if (action === "location") {
      item.location = target.dataset.loc;
      resultList
        .querySelectorAll(`.loc-pill[data-id="${itemId}"]`)
        .forEach((pill) => pill.classList.toggle("active", pill.dataset.loc === item.location));
      return;
    }

    // — chọn loại thực phẩm —
    if (action === "category") {
      item.category = target.dataset.cat;
      resultList
        .querySelectorAll(`.cat-pill[data-id="${itemId}"]`)
        .forEach((pill) => pill.classList.toggle("active", pill.dataset.cat === item.category));
      // Cập nhật thumbnail theo category mới
      const thumb = resultList.querySelector(`.result-item[data-id="${itemId}"] .result-thumbnail img`);
      if (thumb && !item.image_url) {
        thumb.src = getFallbackImageByCategory(item.category);
      }
      return;
    }
  });

  // ─── modal events ─────────────────────────────────────────────────────────────

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

  // ─── init ────────────────────────────────────────────────────────────────────
  readFromSession();
})();
