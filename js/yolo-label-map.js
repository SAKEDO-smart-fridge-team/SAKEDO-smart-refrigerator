/**
 * YOLO Label Map — chuyển tên nhãn tiếng Việt không dấu → có dấu
 * Thêm nhãn mới vào đây khi train thêm class mới.
 */
(function () {
  const MAP = {
    // ── Thịt ──────────────────────────────────────────────────────────────────
    "thit heo":          "Thịt heo",
    "thit bo":           "Thịt bò",
    "thit ga":           "Thịt gà",
    "thit vit":          "Thịt vịt",
    "suon heo":          "Sườn heo",
    "ba chi":            "Ba chỉ",
    "gio lua":           "Giò lụa",
    "cha lua":           "Chả lụa",
    "cha gio":           "Chả giò",
    "xuc xich":          "Xúc xích",
    "lap xuong":         "Lạp xưởng",
    "thit xay":          "Thịt xay",
    "thit nguoi":        "Thịt nguội",

    // ── Hải sản ───────────────────────────────────────────────────────────────
    "tom":               "Tôm",
    "tom the":           "Tôm thẻ",
    "tom su":            "Tôm sú",
    "tom cang":          "Tôm càng",
    "ca":                "Cá",
    "ca tram":           "Cá trắm",
    "ca chep":           "Cá chép",
    "ca thu":            "Cá thu",
    "ca hoi":            "Cá hồi",
    "ca basa":           "Cá ba sa",
    "ca bong":           "Cá bống",
    "ca ngu":            "Cá ngừ",
    "muc":               "Mực",
    "cua":               "Cua",
    "ghe":               "Ghẹ",
    "so":                "Sò",
    "ngheu":             "Nghêu",
    "bach tuoc":         "Bạch tuộc",
    "oc":                "Ốc",

    // ── Trứng ─────────────────────────────────────────────────────────────────
    "trung":             "Trứng",
    "trung ga":          "Trứng gà",
    "trung vit":         "Trứng vịt",
    "trung cut":         "Trứng cút",

    // ── Rau củ ────────────────────────────────────────────────────────────────
    "ca chua":           "Cà chua",
    "ca rot":            "Cà rốt",
    "bap cai":           "Bắp cải",
    "cai thia":          "Cải thìa",
    "cai ngot":          "Cải ngọt",
    "cai be":            "Cải bẹ",
    "rau muong":         "Rau muống",
    "rau cai":           "Rau cải",
    "rau xanh":          "Rau xanh",
    "rau bina":          "Rau bina",
    "rau xep":           "Rau xếp",
    "dua leo":           "Dưa leo",
    "dua chuot":         "Dưa chuột",
    "bi do":             "Bí đỏ",
    "bi xanh":           "Bí xanh",
    "muop":              "Mướp",
    "dau bap":           "Đậu bắp",
    "dau cove":          "Đậu cô ve",
    "ot":                "Ớt",
    "ot chuong":         "Ớt chuông",
    "ot do":             "Ớt đỏ",
    "ot xanh":           "Ớt xanh",
    "hanh tay":          "Hành tây",
    "hanh la":           "Hành lá",
    "hanh tim":          "Hành tím",
    "toi":               "Tỏi",
    "gung":              "Gừng",
    "sa":                "Sả",
    "nghe":              "Nghệ",
    "cu cai":            "Củ cải",
    "cu cai trang":      "Củ cải trắng",
    "cu cai do":         "Củ cải đỏ",
    "khoai tay":         "Khoai tây",
    "khoai lang":        "Khoai lang",
    "khoai mon":         "Khoai môn",
    "bap ngo":           "Bắp ngô",
    "ngo":               "Ngô",
    "bap":               "Bắp",
    "nam":               "Nấm",
    "nam huong":         "Nấm hương",
    "nam dom":           "Nấm đùm",
    "nam tuyet":         "Nấm tuyết",
    "nam linh chi":      "Nấm linh chi",
    "co cai":            "Cải",
    "rau hung":          "Rau húng",
    "rau ngo":           "Rau ngò",
    "tia to":            "Tía tô",
    "kinh gioi":         "Kinh giới",
    "rau ram":           "Rau răm",

    // ── Trái cây ──────────────────────────────────────────────────────────────
    "cam":               "Cam",
    "chuoi":             "Chuối",
    "xoai":              "Xoài",
    "dua hau":           "Dưa hấu",
    "tao":               "Táo",
    "le":                "Lê",
    "nho":               "Nho",
    "dau tay":           "Dâu tây",
    "oi":                "Ổi",
    "buoi":              "Bưởi",
    "mit":               "Mít",
    "sau rieng":         "Sầu riêng",
    "man cut":           "Măng cụt",
    "thanh long":        "Thanh long",
    "chom chom":         "Chôm chôm",
    "vai":               "Vải",
    "nhan":              "Nhãn",
    "bo":                "Bơ",
    "chanh":             "Chanh",
    "khom":              "Khóm",
    "dua":               "Dứa",
    "sung":              "Sung",
    "khe":               "Khế",
    "me":                "Me",
    "vu sua":            "Vú sữa",
    "mang":              "Măng",

    // ── Sữa và sản phẩm từ sữa ───────────────────────────────────────────────
    "sua":               "Sữa",
    "sua tuoi":          "Sữa tươi",
    "sua dac":           "Sữa đặc",
    "pho mai":           "Phô mai",
    "sua chua":          "Sữa chua",
    "kem tuoi":          "Kem tươi",
    "bo sua":            "Bơ sữa",
    "kem tuoi sua":      "Kem sữa",

    // ── Đậu và sản phẩm ──────────────────────────────────────────────────────
    "dau hu":            "Đậu hũ",
    "dau phu":           "Đậu phụ",
    "dau hu chien":      "Đậu hũ chiên",
    "dau xanh":          "Đậu xanh",
    "dau den":           "Đậu đen",
    "dau tuong":         "Đậu tương",
    "dau phong":         "Đậu phộng",
    "hat dieu":          "Hạt điều",
    "hat de":            "Hạt dẻ",

    // ── Tinh bột & bánh ──────────────────────────────────────────────────────
    "gao":               "Gạo",
    "bun":               "Bún",
    "banh mi":           "Bánh mì",
    "banh pho":          "Bánh phở",
    "mi":                "Mì",
    "mien":              "Miến",
    "bot mi":            "Bột mì",
    "banh gao":          "Bánh gạo",

    // ── Gia vị & nước chấm ───────────────────────────────────────────────────
    "nuoc mam":          "Nước mắm",
    "tuong ot":          "Tương ớt",
    "dau hao":           "Dầu hào",
    "xi dau":            "Xì dầu",
    "giam":              "Giấm",
    "muoi":              "Muối",
    "duong":             "Đường",
    "dau an":            "Dầu ăn",
    "tuong den":         "Tương đen",

    // ── Đồ uống ───────────────────────────────────────────────────────────────
    "nuoc":              "Nước",
    "nuoc ngot":         "Nước ngọt",
    "bia":               "Bia",
    "ruou":              "Rượu",
    "tra":               "Trà",
    "ca phe":            "Cà phê",
    "nuoc ep":           "Nước ép",
    "sinh to":           "Sinh tố",
    "nuoc soda":         "Nước soda",
  };

  /**
   * Áp dụng mapping cho tên nhãn YOLO.
   * Xử lý cả dạng underscore (thit_ga) lẫn dạng space (thit ga).
   * Ưu tiên: khớp chính xác → khớp từ đầu chuỗi → fallback capitalize.
   *
   * @param {string} rawName - Tên nhãn gốc từ YOLO (không dấu, viết thường, có thể có _)
   * @returns {string} Tên tiếng Việt có dấu
   */
  function applyYoloLabelMap(rawName) {
    if (!rawName) return rawName;
    // Chuẩn hóa: chuyển underscore → space, lowercase, trim
    const key = rawName.trim().toLowerCase().replace(/_/g, " ");

    // 1. Khớp chính xác
    if (MAP[key]) return MAP[key];

    // 2. Khớp từ đầu chuỗi (ví dụ "thit heo tuoi" → "thit heo" → "Thịt heo")
    //    Ưu tiên pattern dài nhất trước
    const sorted = Object.keys(MAP).sort((a, b) => b.length - a.length);
    for (const pattern of sorted) {
      if (key.startsWith(pattern + " ") || key === pattern) {
        const suffix = key.slice(pattern.length).trim();
        return suffix ? `${MAP[pattern]} ${suffix}` : MAP[pattern];
      }
    }

    // 3. Fallback: viết hoa chữ cái đầu mỗi từ (bỏ underscore)
    return key.replace(/\b\w/g, (c) => c.toUpperCase());
  }

  // Expose globally so scan-result.js (and future modules) can use it
  window.applyYoloLabelMap = applyYoloLabelMap;
  window.YOLO_LABEL_MAP = MAP;
})();
