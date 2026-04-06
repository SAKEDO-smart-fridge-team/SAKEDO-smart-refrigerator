(function () {
  const previewWrap = document.getElementById("camera-preview-wrap");
  const videoEl = document.getElementById("camera-video");
  const previewEl = document.getElementById("captured-preview");
  const fileInput = document.getElementById("file-upload-image");
  const statusEl = document.getElementById("scan-status");
  const loadingOverlay = document.getElementById("scan-loading-overlay");

  const btnOpenCamera = document.getElementById("btn-open-camera");
  const btnCapture = document.getElementById("btn-capture");
  const btnRunDetect = document.getElementById("btn-run-detect");
  const btnReset = document.getElementById("btn-reset-shot");
  const btnGoResult = document.getElementById("btn-go-result");

  const manualNameInput = document.getElementById("manual-item-name");
  const manualExpiryInput = document.getElementById("manual-item-expiry");
  const manualQtyInput = document.getElementById("manual-item-quantity");
  const manualNoteInput = document.getElementById("manual-item-note");
  const manualLocationBtns = document.querySelectorAll("#manual-location-options .location-btn");
  const manualCategoryBtns = document.querySelectorAll("#manual-category-options .category-btn");
  const manualStatusEl = document.getElementById("manual-status");
  const btnManualAdd = document.getElementById("btn-manual-add");

  let stream = null;
  let selectedFile = null;

  function setStatus(message, isError = false) {
    if (!statusEl) return;
    statusEl.textContent = message || "";
    statusEl.classList.toggle("error", Boolean(isError));
  }

  function setLoading(active) {
    if (!loadingOverlay) return;
    loadingOverlay.classList.toggle("active", Boolean(active));
  }

  function setManualStatus(message, isError = false) {
    if (!manualStatusEl) return;
    manualStatusEl.textContent = message || "";
    manualStatusEl.classList.toggle("error", Boolean(isError));
  }

  function getActiveLocation() {
    return document.querySelector("#manual-location-options .location-btn.active")?.dataset.location || "";
  }

  function getActiveCategory() {
    return document.querySelector("#manual-category-options .category-btn.active")?.dataset.category || "";
  }

  async function stopCamera() {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      stream = null;
    }
    if (videoEl) {
      videoEl.srcObject = null;
    }
    previewWrap?.classList.remove("is-live");
  }

  function clearShot() {
    selectedFile = null;
    if (previewEl) {
      previewEl.src = "";
    }
    if (fileInput) {
      fileInput.value = "";
    }
    previewWrap?.classList.remove("has-shot");
    setStatus("");
  }

  async function openCamera() {
    try {
      await stopCamera();
      clearShot();
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      videoEl.srcObject = stream;
      previewWrap?.classList.add("is-live");
      setStatus("Camera đã sẵn sàng. Hãy bấm Chụp ảnh.");
    } catch (error) {
      setStatus("Không thể mở camera. Hãy cho phép quyền truy cập hoặc tải ảnh lên.", true);
    }
  }

  function blobToFile(blob, filename) {
    return new File([blob], filename, { type: blob.type || "image/jpeg" });
  }

  async function captureFrame() {
    if (!stream || !videoEl.videoWidth || !videoEl.videoHeight) {
      setStatus("Camera chưa sẵn sàng để chụp.", true);
      return;
    }

    const canvas = document.createElement("canvas");
    canvas.width = videoEl.videoWidth;
    canvas.height = videoEl.videoHeight;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoEl, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (!blob) {
      setStatus("Không chụp được ảnh. Vui lòng thử lại.", true);
      return;
    }

    selectedFile = blobToFile(blob, `camera-${Date.now()}.jpg`);
    previewEl.src = URL.createObjectURL(blob);
    previewWrap?.classList.add("has-shot");
    await stopCamera();
    setStatus("Đã chụp ảnh. Bấm Nhận diện để phân tích.");
  }

  function handleUpload(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setStatus("File tải lên phải là ảnh.", true);
      return;
    }

    stopCamera();
    selectedFile = file;
    previewEl.src = URL.createObjectURL(file);
    previewWrap?.classList.add("has-shot");
    setStatus("Đã chọn ảnh. Bấm Nhận diện để phân tích.");
  }

  async function runDetection() {
    if (!selectedFile) {
      setStatus("Bạn cần chụp ảnh hoặc tải ảnh lên trước.", true);
      return;
    }

    if (!window.sakedoApi?.getStoredAuth()?.access_token) {
      setStatus("Bạn cần đăng nhập để sử dụng chức năng scan và lưu tủ lạnh.", true);
      return;
    }

    try {
      setLoading(true);
      setStatus("Đang gửi ảnh lên server...");

      const response = await window.sakedoApi.detectFromImage(selectedFile);
      const detections = Array.isArray(response?.detections) ? response.detections : [];

      sessionStorage.setItem("sakedo_scan_detections", JSON.stringify(detections));

      if (!detections.length) {
        setStatus("Không phát hiện sản phẩm nào. Hãy thử lại với ảnh rõ hơn.", true);
        return;
      }

      setStatus(`Nhận diện xong ${detections.length} loại sản phẩm.`);
      navigate("scan-result", document.querySelector(".camera-btn"));
    } catch (error) {
      setStatus(error.message || "Không thể nhận diện lúc này.", true);
    } finally {
      setLoading(false);
    }
  }

  function clearManualForm() {
    if (manualNameInput) manualNameInput.value = "";
    if (manualQtyInput) manualQtyInput.value = "1";
    if (manualNoteInput) manualNoteInput.value = "";
    manualLocationBtns.forEach((btn) => btn.classList.remove("active"));
    manualCategoryBtns.forEach((btn) => btn.classList.remove("active"));
  }

  async function submitManualItem() {
    const name = manualNameInput?.value?.trim() || "";
    const location = getActiveLocation();
    const category = getActiveCategory();
    const expiryDate = manualExpiryInput?.value || "";
    const note = manualNoteInput?.value?.trim() || "";
    const quantity = Number(manualQtyInput?.value || 0);

    if (!window.sakedoApi?.getStoredAuth()?.access_token) {
      setManualStatus("Bạn cần đăng nhập để thêm thực phẩm thủ công.", true);
      return;
    }

    if (!name) {
      setManualStatus("Vui lòng nhập tên thực phẩm.", true);
      return;
    }

    if (!location) {
      setManualStatus("Vui lòng chọn vị trí lưu.", true);
      return;
    }

    if (!category) {
      setManualStatus("Vui lòng chọn loại thực phẩm.", true);
      return;
    }

    if (!expiryDate) {
      setManualStatus("Vui lòng chọn ngày hết hạn.", true);
      return;
    }

    if (!Number.isFinite(quantity) || quantity <= 0) {
      setManualStatus("Số lượng không hợp lệ.", true);
      return;
    }

    try {
      setManualStatus("Đang lưu thực phẩm vào tủ...");
      await window.sakedoApi.saveScannedItems({
        items: [
          {
            name,
            quantity,
            expiry_date: expiryDate,
            location,
            category,
            note
          }
        ]
      });
      setManualStatus("Đã thêm thực phẩm thủ công vào tủ thành công.");
      clearManualForm();
      setTimeout(() => {
        navigate("fridge", document.querySelectorAll(".nav-item")[1]);
      }, 450);
    } catch (error) {
      setManualStatus(error.message || "Không thể lưu thực phẩm thủ công.", true);
    }
  }

  function goToResult() {
    const raw = sessionStorage.getItem("sakedo_scan_detections") || "[]";
    const detections = JSON.parse(raw);
    if (!detections.length) {
      setStatus("Chưa có dữ liệu nhận diện. Vui lòng scan trước.", true);
      return;
    }
    navigate("scan-result", document.querySelector(".camera-btn"));
  }

  btnOpenCamera?.addEventListener("click", openCamera);
  btnCapture?.addEventListener("click", captureFrame);
  btnRunDetect?.addEventListener("click", runDetection);
  btnReset?.addEventListener("click", () => {
    stopCamera();
    clearShot();
  });
  btnGoResult?.addEventListener("click", goToResult);
  fileInput?.addEventListener("change", handleUpload);

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  if (manualExpiryInput) manualExpiryInput.value = `${yyyy}-${mm}-${dd}`;

  manualLocationBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      manualLocationBtns.forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      setManualStatus("");
    });
  });

  manualCategoryBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      manualCategoryBtns.forEach((x) => x.classList.remove("active"));
      btn.classList.add("active");
      setManualStatus("");
    });
  });

  btnManualAdd?.addEventListener("click", submitManualItem);

  document.addEventListener("pageChanged", (e) => {
    if (e.detail.page !== "camera") {
      stopCamera();
    }
  });
})();
