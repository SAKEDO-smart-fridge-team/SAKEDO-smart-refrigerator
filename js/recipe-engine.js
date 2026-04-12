// js/recipe-engine.js
// Engine gợi ý công thức dùng chung cho cả trang Mr. Chè (ai-chat) và Tủ lạnh (fridge)
// Expose qua window.recipeEngine

(function () {
  "use strict";

  // ─────────────────────────────────────────────
  // DATABASE: 26 CÔNG THỨC
  // ─────────────────────────────────────────────
  const RECIPE_TEMPLATES = [
    {
      id: "trung_chien_ca",
      name: "Trứng chiên cà chua",
      img: "assets/img/trungchien.png",
      keywords: ["trung", "ca chua", "hanh"],
      required: ["trứng", "cà chua", "hành lá"],
      tags: ["nau_nhanh", "giam_can", "tang_co"],
      prepTime: 15,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ", instructions: ["Rửa sạch cà chua, cắt múi cau. Đập trứng vào tô, đánh đều với chút muối.", "Thái nhỏ hành lá, để riêng phần đầu hành để phi thơm."] },
        { stepNumber: 2, title: "CHẾ BIẾN", instructions: ["Làm nóng chảo với dầu ăn, phi thơm đầu hành.", "Cho cà chua vào xào đến khi mềm và ra nước, nêm chút muối + đường.", "Đổ trứng vào, đảo nhẹ tay đến khi trứng vừa chín tới (còn ẩm)."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Rắc hành lá lên trên, nêm lại gia vị vừa miệng.", "Dùng nóng cùng cơm trắng."] }
      ]
    },
    {
      id: "canh_chua_ca",
      name: "Canh chua cá",
      img: "assets/img/canhchua.png",
      keywords: ["ca", "ca chua", "khom", "thom", "dua"],
      required: ["cá", "cà chua", "dứa (thơm)", "giá đỗ"],
      tags: ["giam_can", "tang_co"],
      prepTime: 30,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ", instructions: ["Cá làm sạch, cắt khúc vừa ăn, ướp với muối + tiêu + gừng 10 phút.", "Cà chua cắt múi cau. Dứa cắt miếng vừa ăn. Giá đỗ rửa sạch."] },
        { stepNumber: 2, title: "NẤU CANH", instructions: ["Phi thơm hành + cà chua với dầu ăn. Đổ nước vào đun sôi.", "Cho cá và dứa vào, nấu nhỏ lửa đến khi cá chín (khoảng 10 phút).", "Thêm giá đỗ, nêm nếm: muối, đường, nước mắm cho vị chua-mặn-ngọt hài hòa."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Thêm ngò gai và rau quế nếu có. Dùng nóng với cơm."] }
      ]
    },
    {
      id: "rau_xao_toi",
      name: "Rau xào tỏi",
      img: "assets/images/traicay.png",
      keywords: ["rau", "cai", "bo xoi", "cai ngot", "cai thia", "rau muong"],
      required: ["rau xanh (cải/muống/bó xôi)", "tỏi"],
      tags: ["nau_nhanh", "giam_can", "thuan_chay"],
      prepTime: 10,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ", instructions: ["Rau rửa sạch, để ráo nước, nhặt bỏ lá già.", "Tỏi bóc vỏ, đập dập và băm nhỏ."] },
        { stepNumber: 2, title: "XÀO", instructions: ["Làm nóng chảo với dầu ăn lửa lớn. Phi vàng thơm tỏi.", "Trút rau vào đảo nhanh tay trên lửa lớn (2–3 phút). Nêm muối, hạt nêm vừa miệng."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Cho ra đĩa ngay, rau giòn ngon nhất khi còn nóng."] }
      ]
    },
    {
      id: "thit_kho_trung",
      name: "Thịt heo kho trứng",
      img: "assets/images/thit.png",
      keywords: ["thit heo", "thit lon", "trung", "thit ba chi"],
      required: ["thịt heo (ba chỉ)", "trứng", "nước dừa"],
      tags: ["tang_co"],
      prepTime: 45,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ & ƯỚP", instructions: ["Thịt heo cắt miếng vừa ăn, ướp với nước mắm + đường + tiêu + tỏi băm trong 20 phút.", "Trứng luộc chín, bóc vỏ."] },
        { stepNumber: 2, title: "KHO", instructions: ["Cho thịt vào nồi, đảo đều trên lửa lớn đến khi săn lại.", "Đổ nước dừa tươi vào xâm xấp mặt thịt. Thêm trứng.", "Đậy nắp, kho lửa vừa khoảng 30 phút đến khi nước sốt cạn và sánh lại."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Nêm lại vị mặn-ngọt vừa miệng. Rắc tiêu, thêm hành lá.", "Dùng nóng cùng cơm trắng và dưa leo."] }
      ]
    },
    {
      id: "dau_hu_sot_ca",
      name: "Đậu hũ sốt cà chua",
      img: "assets/images/traicay.png",
      keywords: ["dau hu", "dau phu", "ca chua"],
      required: ["đậu hũ", "cà chua", "hành tây"],
      tags: ["thuan_chay", "giam_can", "nau_nhanh"],
      prepTime: 20,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ", instructions: ["Đậu hũ cắt miếng vuông vừa ăn, dùng giấy thấm khô.", "Cà chua bổ múi cau, hành tây thái múi cau."] },
        { stepNumber: 2, title: "CHẾ BIẾN", instructions: ["Chiên sơ đậu hũ với dầu ăn đến khi vàng hai mặt, vớt ra.", "Phi thơm hành tây, cho cà chua vào xào đến khi mềm. Nêm: muối, đường, nước tương, tương ớt.", "Cho đậu hũ vào đảo đều, đun thêm 3 phút cho ngấm sốt."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Rắc hành lá, thêm ít tiêu. Dùng nóng với cơm."] }
      ]
    },
    {
      id: "chao_trung",
      name: "Cháo trứng gà",
      img: "assets/images/khac.png",
      keywords: ["trung", "gao", "com"],
      required: ["gạo (hoặc cơm nguội)", "trứng gà", "hành lá"],
      tags: ["giam_can", "nau_nhanh"],
      prepTime: 20,
      steps: [
        { stepNumber: 1, title: "NẤU CHÁO", instructions: ["Vo gạo, nấu với nước theo tỉ lệ 1:8 đến khi gạo nở mềm.", "Nếu dùng cơm nguội: cho cơm vào nồi nước, đun sôi và khuấy đều."] },
        { stepNumber: 2, title: "THÊM TRỨNG", instructions: ["Đánh trứng, từ từ đổ vào cháo đang sôi, khuấy nhẹ để trứng chín dạng sợi.", "Nêm muối, hạt nêm vừa ăn."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Chan cháo ra tô, rắc hành lá thái nhỏ và tiêu. Dùng nóng."] }
      ]
    },
    {
      id: "bo_xao_ca_rot",
      name: "Thịt bò xào cà rốt",
      img: "assets/images/thit.png",
      keywords: ["thit bo", "ca rot"],
      required: ["thịt bò", "cà rốt", "hành tây"],
      tags: ["tang_co", "nau_nhanh"],
      prepTime: 20,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ & ƯỚP", instructions: ["Thịt bò thái lát mỏng theo thớ ngang. Ướp với: nước tương, dầu hào, tiêu, bột tỏi – trong 15 phút.", "Cà rốt thái lát xéo. Hành tây thái múi cau."] },
        { stepNumber: 2, title: "XÀO", instructions: ["Làm nóng chảo lửa lớn với dầu. Xào thịt bò đến khi vừa chín (khoảng 1 phút), vớt ra.", "Phi thơm tỏi, xào cà rốt + hành tây khoảng 3 phút. Cho thịt bò vào, đảo đều."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Nêm lại gia vị, thêm chút dầu hào cho bóng đẹp. Dùng nóng với cơm."] }
      ]
    },
    {
      id: "canh_bi_dau_hu",
      name: "Canh bí đỏ đậu hũ",
      img: "assets/images/traicay.png",
      keywords: ["bi do", "bi ngu", "dau hu", "dau phu"],
      required: ["bí đỏ", "đậu hũ", "hành lá"],
      tags: ["thuan_chay", "giam_can"],
      prepTime: 25,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ", instructions: ["Bí đỏ gọt vỏ, bỏ ruột, cắt miếng vuông vừa ăn.", "Đậu hũ cắt miếng nhỏ."] },
        { stepNumber: 2, title: "NẤU CANH", instructions: ["Đun sôi nước (hoặc nước dùng rau củ), cho bí vào nấu đến khi mềm (~15 phút).", "Thêm đậu hũ vào, đun thêm 3 phút. Nêm muối, hạt nêm (chay) vừa ăn."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Rắc hành lá, thêm tiêu. Dùng nóng – canh ngọt tự nhiên, ít calo."] }
      ]
    },
    {
      id: "ca_kho_gung",
      name: "Cá kho gừng",
      img: "assets/img/canhchua.png",
      keywords: ["ca", "gung"],
      required: ["cá (cá basa/diêu hồng/cá thu)", "gừng", "ớt"],
      tags: ["giam_can", "tang_co"],
      prepTime: 35,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ & ƯỚP", instructions: ["Cá làm sạch, cắt khúc, ướp với: nước mắm, đường, tiêu, gừng băm, ớt – trong 20 phút."] },
        { stepNumber: 2, title: "KHO", instructions: ["Cho cá vào nồi đất hoặc chảo, đổ nước xâm xấp. Kho lửa vừa đến khi nước cạn sánh.", "Lật cá nhẹ tay, tránh làm vỡ miếng cá."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Nêm lại mặn-ngọt, rắc tiêu + hành lá. Dùng nóng với cơm trắng."] }
      ]
    },
    {
      id: "salad_rau",
      name: "Salad rau trộn",
      img: "assets/images/traicay.png",
      keywords: ["dua leo", "ca chua", "xa lach", "bap cai", "rau"],
      required: ["xà lách / bắp cải", "dưa leo", "cà chua"],
      tags: ["giam_can", "thuan_chay", "nau_nhanh"],
      prepTime: 10,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ", instructions: ["Rửa sạch tất cả rau. Dưa leo cắt lát mỏng. Cà chua bổ múi. Xà lách xé miếng."] },
        { stepNumber: 2, title: "LÀM SỐT TRỘN", instructions: ["Trộn đều: 2 muỗng canh dầu ô liu, 1 muỗng canh giấm/chanh, 1 muỗng nhỏ mật ong, muối + tiêu theo khẩu vị."] },
        { stepNumber: 3, title: "TRỘN & THƯỞNG THỨC", instructions: ["Cho rau vào tô lớn, rưới sốt lên, trộn đều nhẹ nhàng.", "Dùng ngay để rau giữ được độ giòn tươi."] }
      ]
    },
    {
      id: "trung_hap_thit",
      name: "Trứng hấp thịt băm",
      img: "assets/img/trungchien.png",
      keywords: ["trung", "thit bam", "thit heo", "thit lon"],
      required: ["trứng", "thịt heo băm", "nấm hương (nếu có)"],
      tags: ["tang_co", "nau_nhanh"],
      prepTime: 20,
      steps: [
        { stepNumber: 1, title: "CHUẨN BỊ", instructions: ["Thịt heo băm ướp với nước mắm, tiêu, dầu mè, hành khô băm.", "Đánh 3 trứng với ít nước lọc, nêm chút muối + tiêu."] },
        { stepNumber: 2, title: "HẤP", instructions: ["Trải thịt băm đều vào tô chịu nhiệt.", "Đổ hỗn hợp trứng lên trên thịt. Hấp cách thủy lửa vừa khoảng 15 phút đến khi trứng đặc lại."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Rắc hành lá, thêm vài giọt nước mắm. Dùng nóng với cơm."] }
      ]
    },
    {
      id: "bap_cai_xao",
      name: "Bắp cải xào tỏi",
      img: "assets/images/traicay.png",
      keywords: ["bap cai", "cai bap"],
      required: ["bắp cải", "tỏi"],
      tags: ["giam_can", "thuan_chay", "nau_nhanh"],
      prepTime: 12,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ", instructions: ["Bắp cải rửa sạch, thái sợi hoặc bẻ từng miếng nhỏ. Tỏi đập dập, băm nhỏ."] },
        { stepNumber: 2, title: "XÀO", instructions: ["Làm nóng chảo với dầu lửa lớn. Phi vàng tỏi thơm.", "Cho bắp cải vào đảo đều trên lửa lớn 3–4 phút. Nêm muối + hạt nêm vừa miệng."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Thêm ít tiêu, dùng ngay khi còn giòn và nóng."] }
      ]
    },
    {
      id: "tom_rang_muoi",
      name: "Tôm rang muối",
      img: "assets/images/thit.png",
      keywords: ["tom"],
      required: ["tôm tươi", "tỏi", "ớt"],
      tags: ["tang_co", "nau_nhanh"],
      prepTime: 15,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ", instructions: ["Tôm rửa sạch, cắt râu và chân cho gọn. Ướp với muối + tiêu + tỏi băm + chút đường trong 10 phút."] },
        { stepNumber: 2, title: "RANG", instructions: ["Làm nóng chảo, thêm ít dầu. Cho tôm vào rang đều trên lửa vừa đến khi tôm chín đỏ và thơm."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Cho ra đĩa, rắc thêm tiêu và hành ngò. Ăn kèm cơm hoặc bia đều ngon!"] }
      ]
    },
    {
      id: "canh_rau_cu",
      name: "Canh rau củ thanh mát",
      img: "assets/images/traicay.png",
      keywords: ["ca rot", "khoai tay", "su su", "rau", "ngo", "hanh"],
      required: ["cà rốt", "khoai tây (hoặc su su)", "hành lá"],
      tags: ["thuan_chay", "giam_can"],
      prepTime: 25,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ", instructions: ["Gọt vỏ và cắt cà rốt, khoai tây thành miếng vuông vừa ăn.", "Hành lá thái nhỏ."] },
        { stepNumber: 2, title: "NẤU CANH", instructions: ["Đun sôi nước, cho cà rốt và khoai tây vào nấu đến khi mềm (khoảng 15 phút).", "Nêm muối, hạt nêm chay vừa miệng."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Rắc hành lá, thêm tiêu. Canh ngọt tự nhiên, thanh mát và ít calo."] }
      ]
    },
    {
      id: "ca_chien_sot",
      name: "Cá chiên sốt cà chua",
      img: "assets/images/cathu.png",
      keywords: ["ca", "ca chua", "ca thu", "ca basa"],
      required: ["cá (bất kỳ loại)", "cà chua", "hành tây"],
      tags: ["tang_co"],
      prepTime: 30,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ & CHIÊN CÁ", instructions: ["Cá làm sạch, thấm khô, ướp muối + tiêu + gừng 10 phút.", "Chiên cá trong dầu nóng đến vàng giòn hai mặt, vớt ra để ráo."] },
        { stepNumber: 2, title: "LÀM SỐT", instructions: ["Phi thơm hành tây + tỏi, cho cà chua vào xào mềm.", "Nêm: cà chua tương, đường, muối, nước mắm. Đun sôi đặc sệt."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Chan sốt lên cá chiên. Rắc ngò rí và tiêu. Dùng nóng với cơm."] }
      ]
    },
    {
      id: "dau_hu_chien",
      name: "Đậu hũ chiên giòn",
      img: "assets/images/khac.png",
      keywords: ["dau hu", "dau phu"],
      required: ["đậu hũ"],
      tags: ["thuan_chay", "nau_nhanh"],
      prepTime: 15,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ", instructions: ["Đậu hũ cắt miếng vừa ăn, dùng giấy thấm khô hoàn toàn (quan trọng để chiên giòn)."] },
        { stepNumber: 2, title: "CHIÊN", instructions: ["Làm nóng chảo với lượng dầu vừa đủ. Chiên đậu hũ lửa vừa đến khi vàng giòn đều các mặt (~8–10 phút)."] },
        { stepNumber: 3, title: "THƯỞNG THỨC", instructions: ["Vớt ra để ráo dầu, rắc muối + tiêu + ớt bột.", "Chấm cùng nước tương gừng hoặc tương ớt đều ngon."] }
      ]
    },
    {
      id: "trung_luoc_salad",
      name: "Trứng luộc rau salad",
      img: "assets/img/trungchien.png",
      keywords: ["trung", "dua leo", "ca chua", "xa lach"],
      required: ["trứng", "dưa leo", "cà chua"],
      tags: ["giam_can", "tang_co", "nau_nhanh"],
      prepTime: 12,
      steps: [
        { stepNumber: 1, title: "LUỘC TRỨNG", instructions: ["Luộc trứng trong nước sôi 8 phút (lòng đào) hoặc 12 phút (chín hẳn). Ngâm nước lạnh, bóc vỏ và bổ đôi."] },
        { stepNumber: 2, title: "CHUẨN BỊ RAU", instructions: ["Dưa leo cắt lát. Cà chua bổ múi. Xà lách (nếu có) xé miếng."] },
        { stepNumber: 3, title: "TRỘN & PHỤC VỤ", instructions: ["Xếp rau ra đĩa, đặt trứng lên trên.", "Rưới sốt: dầu ô liu + chanh + muối + tiêu hoặc sốt mè rang. Dùng ngay."] }
      ]
    },
    {
      id: "canh_thit_bap_cai",
      name: "Canh thịt bò bắp cải",
      img: "assets/images/thit.png",
      keywords: ["thit bo", "bap cai", "ca rot"],
      required: ["thịt bò", "bắp cải", "cà rốt"],
      tags: ["tang_co"],
      prepTime: 30,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ", instructions: ["Thịt bò thái lát mỏng, ướp muối + tiêu + gừng.", "Bắp cải thái sợi, cà rốt thái lát."] },
        { stepNumber: 2, title: "NẤU CANH", instructions: ["Phi thơm hành, cho thịt bò vào xào chín nhanh. Đổ nước vào đun sôi.", "Cho bắp cải và cà rốt vào nấu thêm 10 phút. Nêm nếm vừa miệng."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Thêm hành lá, ngò rí. Dùng nóng với cơm."] }
      ]
    },
    {
      id: "ga_kho_sa_ot",
      name: "Gà kho sả ớt",
      img: "assets/images/thit.png",
      keywords: ["ga", "sa", "ot", "thit ga"],
      required: ["gà (đùi/cánh)", "sả", "ớt", "tỏi"],
      tags: ["tang_co"],
      prepTime: 35,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ & ƯỚP", instructions: ["Gà chặt miếng vừa ăn, rửa sạch với muối và gừng, để ráo.", "Ướp với: nước mắm, đường, tiêu, tỏi băm, sả băm, ớt – trong 20 phút."] },
        { stepNumber: 2, title: "KHO", instructions: ["Phi thơm sả và tỏi với dầu ăn. Cho gà vào đảo đều trên lửa lớn đến khi vàng săn.", "Đổ ít nước vào, kho lửa vừa khoảng 20 phút đến khi nước sốt sánh."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Nêm lại mặn-ngọt, rắc tiêu và ớt lát. Dùng nóng với cơm trắng."] }
      ]
    },
    {
      id: "com_chien_trung",
      name: "Cơm chiên trứng",
      img: "assets/img/trungchien.png",
      keywords: ["com", "trung", "hanh", "gao"],
      required: ["cơm nguội", "trứng", "hành lá"],
      tags: ["nau_nhanh", "tang_co"],
      prepTime: 15,
      steps: [
        { stepNumber: 1, title: "CHUẨN BỊ", instructions: ["Dùng cơm nguội để hạt cơm rời, không bị dính.", "Đập trứng vào tô, nêm chút muối, đánh đều. Thái nhỏ hành lá."] },
        { stepNumber: 2, title: "CHIÊN", instructions: ["Làm nóng chảo với dầu lửa lớn. Đổ trứng vào, khuấy nhanh rồi trút cơm vào.", "Đảo liên tục lửa lớn khoảng 3–4 phút cho cơm đều vàng và tơi. Nêm muối, nước tương, hạt nêm."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Rắc hành lá thái nhỏ, thêm tiêu. Dùng ngay – ngon nhất khi còn nóng hổi."] }
      ]
    },
    {
      id: "sup_bi_do_ga",
      name: "Súp bí đỏ gà",
      img: "assets/images/traicay.png",
      keywords: ["bi do", "bi ngu", "ga", "thit ga"],
      required: ["bí đỏ", "gà (ức/đùi)", "hành tây"],
      tags: ["giam_can", "tang_co"],
      prepTime: 35,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ", instructions: ["Bí đỏ gọt vỏ, cắt hạt lựu. Gà luộc chín, xé sợi. Hành tây băm nhỏ."] },
        { stepNumber: 2, title: "NẤU SÚP", instructions: ["Phi thơm hành tây với dầu ăn. Cho bí vào xào nhẹ, đổ nước dùng gà vào đun sôi.", "Khi bí mềm, dùng thìa nghiền nát để súp sánh mịn. Thêm gà xé vào."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Nêm muối, hạt tiêu. Rắc hành lá và thêm ít kem tươi nếu có. Dùng nóng."] }
      ]
    },
    {
      id: "nam_xao_toi_bo",
      name: "Nấm xào tỏi bơ",
      img: "assets/images/traicay.png",
      keywords: ["nam", "nam huong", "nam dong co", "nam kim cham", "toi"],
      required: ["nấm (bất kỳ)", "tỏi", "bơ / dầu ăn"],
      tags: ["thuan_chay", "giam_can", "nau_nhanh"],
      prepTime: 12,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ", instructions: ["Nấm rửa sạch, để ráo, cắt miếng vừa ăn. Tỏi bóc vỏ, đập dập."] },
        { stepNumber: 2, title: "XÀO", instructions: ["Làm nóng chảo với bơ hoặc dầu ăn lửa vừa-lớn. Phi vàng tỏi thơm.", "Cho nấm vào đảo đều lửa lớn 3–4 phút đến khi nấm se lại. Nêm muối + tiêu + hạt nêm chay."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Thêm hành lá thái nhỏ, đảo đều rồi tắt bếp. Dùng nóng với cơm hoặc bánh mì."] }
      ]
    },
    {
      id: "mi_xao_thit_bo",
      name: "Mì xào thịt bò",
      img: "assets/images/thit.png",
      keywords: ["mi", "thit bo", "bun", "hanh tay", "ca rot"],
      required: ["mì sợi (mì trứng / mì tươi)", "thịt bò", "rau xanh (cải/giá)"],
      tags: ["tang_co", "nau_nhanh"],
      prepTime: 20,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ & ƯỚP", instructions: ["Thịt bò thái lát mỏng, ướp: nước tương, dầu hào, tiêu, bột tỏi – 10 phút.", "Trụng mì qua nước sôi đến khi vừa mềm, vớt ra xả nước lạnh."] },
        { stepNumber: 2, title: "XÀO", instructions: ["Xào thịt bò lửa lớn đến khi vừa chín, vớt ra. Phi thơm tỏi, xào rau xanh.", "Cho mì vào đảo đều, thêm nước tương + dầu hào nêm vừa. Trút thịt bò vào, đảo nhanh tay."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Rắc tiêu, hành lá, thêm vài giọt dầu mè. Dùng ngay khi còn nóng."] }
      ]
    },
    {
      id: "canh_chua_tom",
      name: "Canh chua tôm",
      img: "assets/images/thit.png",
      keywords: ["tom", "ca chua", "dua", "khom", "thom", "giac"],
      required: ["tôm tươi", "cà chua", "dứa (thơm)"],
      tags: ["giam_can", "tang_co"],
      prepTime: 25,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ", instructions: ["Tôm rửa sạch, cắt râu. Cà chua bổ múi. Dứa cắt miếng nhỏ. Giá đỗ rửa sạch."] },
        { stepNumber: 2, title: "NẤU CANH", instructions: ["Phi thơm hành + cà chua, đổ nước vào đun sôi. Cho dứa vào nấu 5 phút.", "Thêm tôm vào, nấu 3–4 phút đến khi tôm chín đỏ. Cho giá đỗ vào, tắt bếp ngay."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Nêm nước mắm + đường + muối cho chua-ngọt hài hòa. Thêm ngò gai và rau quế. Dùng nóng."] }
      ]
    },
    {
      id: "dau_hu_non_xao_nam",
      name: "Đậu hũ non xào nấm",
      img: "assets/images/khac.png",
      keywords: ["dau hu", "dau phu", "nam", "nam huong"],
      required: ["đậu hũ non", "nấm", "tỏi"],
      tags: ["thuan_chay", "giam_can", "nau_nhanh"],
      prepTime: 15,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ", instructions: ["Đậu hũ non cắt miếng vừa ăn, nhẹ tay tránh nát. Nấm rửa sạch, cắt lát. Tỏi băm nhỏ."] },
        { stepNumber: 2, title: "CHẾ BIẾN", instructions: ["Phi thơm tỏi với dầu. Cho nấm vào xào đến khi chín mềm, nêm nước tương + đường.", "Thêm đậu hũ vào, đảo nhẹ cho ngấm sốt. Đun nhỏ lửa 3 phút."] },
        { stepNumber: 3, title: "HOÀN THIỆN", instructions: ["Rắc tiêu, thêm hành lá. Dùng nóng với cơm – thanh đạm, bổ dưỡng."] }
      ]
    },
    {
      id: "rau_cu_luoc_cham_man",
      name: "Rau củ luộc chấm mắm tỏi",
      img: "assets/images/traicay.png",
      keywords: ["ca rot", "su su", "khoai tay", "bap cai", "rau cu", "bo xoi"],
      required: ["rau củ các loại (cà rốt / su su / bắp cải)"],
      tags: ["giam_can", "thuan_chay", "nau_nhanh"],
      prepTime: 15,
      steps: [
        { stepNumber: 1, title: "SƠ CHẾ", instructions: ["Rửa sạch rau củ, gọt vỏ nếu cần, cắt miếng vừa ăn hoặc chẻ đôi.", "Bắp cải bẻ/thái từng miếng."] },
        { stepNumber: 2, title: "LUỘC", instructions: ["Đun nước sôi với chút muối. Cho rau củ vào luộc đến khi vừa mềm chín.", "Cà rốt/khoai tây: 8–10 phút. Bắp cải/su su: 4–5 phút."] },
        { stepNumber: 3, title: "PHA NƯỚC CHẤM & THƯỞNG THỨC", instructions: ["Pha nước chấm: nước mắm + đường + chanh + tỏi + ớt băm – khuấy đều.", "Xếp rau củ ra đĩa, chấm nước mắm tỏi ớt. Đơn giản, thanh mát và rất bổ dưỡng!"] }
      ]
    }
  ];

  // ─────────────────────────────────────────────
  // HELPER FUNCTIONS
  // ─────────────────────────────────────────────

  const normalizeText = (value) =>
    (value || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

  function getDaysLeft(expiryDate) {
    if (!expiryDate) return null;
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const expiry = new Date(expiryDate); expiry.setHours(0, 0, 0, 0);
    return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
  }

  function buildInventory(items) {
    // Hỗ trợ cả field 'expiry_date' (API) và 'expiryDate' (normalized fridge)
    const normalized = items.map((item) => ({
      name: item.name || "",
      quantity: Number(item.quantity) || 1,
      normalizedName: normalizeText(item.name),
      expiry_date: item.expiry_date || item.expiryDate || null
    }));
    const keywordSet = new Set();
    normalized.forEach((item) => {
      item.normalizedName.split(/\s+/).forEach((t) => { if (t) keywordSet.add(t); });
      keywordSet.add(item.normalizedName);
    });
    return { normalized, keywordSet };
  }

  function buildIngredients(normalizedItems, requiredList) {
    const available = [], missing = [];
    requiredList.forEach((req) => {
      const reqNorm = normalizeText(req);
      // Filter tokens to minimum 3 chars to avoid false positives
      // e.g. "ca" from "cà chua" should NOT match "cá hồi"
      const tokens = reqNorm.split(/[\s\/()]+/).filter((t) => t.length >= 3);
      const matched = normalizedItems.find((item) => {
        // Prioritise full-phrase match first (most accurate)
        if (item.normalizedName === reqNorm) return true;
        if (reqNorm.includes(item.normalizedName) || item.normalizedName.includes(reqNorm)) return true;
        // Token-level match: only allow tokens of 3+ chars
        return tokens.length > 0 && tokens.some((t) =>
          item.normalizedName.includes(t) || t.includes(item.normalizedName)
        );
      });
      if (matched) {
        available.push({ name: matched.name, weight: `${matched.quantity} phần` });
      } else {
        missing.push({ name: req.replace(/\s*\([^)]*\)/g, "").trim(), weight: "1 phần" });
      }
    });
    return { available, missing };
  }

  function getExpiringItems(items, daysThreshold = 7) {
    return items
      .filter((item) => { const d = getDaysLeft(item.expiry_date || item.expiryDate); return d !== null && d <= daysThreshold; })
      .sort((a, b) => getDaysLeft(a.expiry_date || a.expiryDate) - getDaysLeft(b.expiry_date || b.expiryDate));
  }

  function scoreTemplate(template, keywordSet) {
    return template.keywords.reduce((total, kw) => {
      const kn = normalizeText(kw);
      // Exact match first
      if (keywordSet.has(kn)) return total + 1;
      // Substring match only when both sides are at least 3 characters
      // to prevent short tokens like "ca" from matching unrelated words
      for (const k of keywordSet) {
        if (k.length < 3 || kn.length < 3) continue;
        if (k.includes(kn) || kn.includes(k)) return total + 1;
      }
      return total;
    }, 0);
  }

  // ─────────────────────────────────────────────
  // ENGINE CHÍNH
  // ─────────────────────────────────────────────

  function buildSuggestionsByMode(items, mode) {
    const templates = [...RECIPE_TEMPLATES];
    const shuffle = (arr) => { for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; };

    if (!items.length) {
      const candidates = mode === "ngau_nhien"
        ? shuffle([...templates])
        : (templates.filter((t) => t.tags.includes(mode)).length ? templates.filter((t) => t.tags.includes(mode)) : templates);
      return candidates.map((t) => ({
        name: t.name, img: t.img, steps: t.steps, tags: t.tags, prepTime: t.prepTime,
        ingredients: { available: [], missing: t.required.map((r) => ({ name: r.replace(/\s*\([^)]*\)/g, "").trim(), weight: "1 phần" })) }
      }));
    }

    const { normalized, keywordSet } = buildInventory(items);
    let scored = [];

    if (mode === "ngau_nhien") {
      const all = templates.map((t) => ({ template: t, score: scoreTemplate(t, keywordSet) }));
      scored = [...shuffle(all.filter((e) => e.score > 0)), ...shuffle(all.filter((e) => e.score === 0))];

    } else if (mode === "gan_het_han") {
      const expiringItems = getExpiringItems(items, 7);
      const expKw = new Set();
      expiringItems.forEach((item) => { const n = normalizeText(item.name); n.split(/\s+/).forEach((t) => expKw.add(t)); expKw.add(n); });
      scored = templates.map((t) => ({ template: t, score: scoreTemplate(t, expKw) * 5 + scoreTemplate(t, keywordSet) })).sort((a, b) => b.score - a.score);

    } else {
      const filtered = templates.filter((t) => t.tags.includes(mode));
      const pool = filtered.length ? filtered : templates;
      scored = pool.map((t) => ({ template: t, score: scoreTemplate(t, keywordSet) })).sort((a, b) => b.score - a.score);
    }

    return scored.map(({ template }) => ({
      name: template.name, img: template.img, steps: template.steps, tags: template.tags, prepTime: template.prepTime,
      ingredients: buildIngredients(normalized, template.required)
    }));
  }

  // ─────────────────────────────────────────────
  // EXPOSE
  // ─────────────────────────────────────────────
  window.recipeEngine = {
    RECIPE_TEMPLATES,
    normalizeText,
    getDaysLeft,
    buildInventory,
    buildIngredients,
    getExpiringItems,
    scoreTemplate,
    buildSuggestionsByMode
  };

})();
