/**
 * Animate a numeric element from 0 to `target` over `duration` ms.
 * @param {HTMLElement} el
 * @param {number} target
 * @param {number} duration  (ms, default 700)
 * @param {string} [format]  "padded" → pad to 2 digits with leading zero
 */
function animateCounter(el, target, duration = 700, format = "normal") {
  if (!el) return;
  const start = performance.now();
  const from = 0;

  function tick(now) {
    const elapsed = now - start;
    const progress = Math.min(elapsed / duration, 1);
    // Ease-out cubic
    const eased = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(from + (target - from) * eased);

    if (format === "padded") {
      el.textContent = String(current).padStart(2, "0");
    } else {
      el.textContent = String(current);
    }

    if (progress < 1) requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
}

document.addEventListener("DOMContentLoaded", () => {
	// Khởi tạo ngôn ngữ
	if (window.sakedoI18n) {
		window.sakedoI18n.translatePage();
	}

	const auth = window.sakedoApi.getStoredAuth();

	const userProfile = document.getElementById("user-profile");
	const authButtons = document.getElementById("auth-buttons");
	const logoutLink = document.getElementById("logout-link");

	if (!auth?.access_token) {
		// Chưa đăng nhập
		if (userProfile) userProfile.style.display = "none";
		if (logoutLink) logoutLink.style.display = "none";
		if (authButtons) authButtons.style.display = "flex";
	} else {
		// Đã đăng nhập
		if (userProfile) userProfile.style.display = "flex";
		if (logoutLink) logoutLink.style.display = "block";
		if (authButtons) authButtons.style.display = "none";

		const welcomeNameEl = document.getElementById("welcome-name");
		let currentDisplayName = "Khách hàng";

		function updateTopbarName(name) {
			currentDisplayName = (name || "").trim() || "Khách hàng";
			const welcomePrefix = window.sakedoI18n?.translate("top-welcome") || "Xin chào";
			if (welcomeNameEl) {
				welcomeNameEl.textContent = `${welcomePrefix}, ${currentDisplayName}!`;
			}
		}

		const user = auth.user || {};
		const emailPrefix = ((user.email || "").split("@")[0] || "Bạn").trim();
		const displayName =
			(user.full_name || "").trim() ||
			(user.name || "").trim() ||
			emailPrefix;

		updateTopbarName(displayName);

		// Lắng nghe sự kiện cập nhật từ trang Profile
		document.addEventListener("userUpdated", (e) => {
			updateTopbarName(e?.detail?.full_name || currentDisplayName);
		});

		document.addEventListener("languageChanged", () => {
			updateTopbarName(currentDisplayName);
		});
	}

	if (logoutLink) {
		logoutLink.addEventListener("click", (event) => {
			event.preventDefault();
			window.sakedoApi.clearAuth();
			window.location.reload();
		});
	}

	// Giao diện Sáng / Tối (Single Toggle Button)
	const themeToggleBtn = document.getElementById("btn-theme-toggle");
	const lightIcon = document.querySelector(".theme-toggle-btn .light-mode");
	const darkIcon = document.querySelector(".theme-toggle-btn .dark-mode");

	function applyTheme(theme) {
		if (theme === "dark") {
			document.body.classList.add("dark-theme");
			if (lightIcon) lightIcon.style.display = "none";
			if (darkIcon) darkIcon.style.display = "inline-block";
		} else {
			document.body.classList.remove("dark-theme");
			if (lightIcon) lightIcon.style.display = "inline-block";
			if (darkIcon) darkIcon.style.display = "none";
		}
	}

	// Initialize theme
	const storedTheme = localStorage.getItem("sakedo-theme") || "light";
	applyTheme(storedTheme);

	if (themeToggleBtn) {
		themeToggleBtn.addEventListener("click", () => {
			const isDark = document.body.classList.contains("dark-theme");
			const newTheme = isDark ? "light" : "dark";
			applyTheme(newTheme);
			localStorage.setItem("sakedo-theme", newTheme);
		});
	}

	// Tự động tải trang chủ (home) khi mở app
	if (typeof navigate === "function") {
		navigate("home", document.querySelector(".nav-item"));
	}
});

// Update Dashboard (Home) stats after navigation
document.addEventListener("pageChanged", (e) => {
	if (e.detail.page === "home") {
		updateHomeStats();
	}
});

function getDaysLeft(expiryDate) {
	if (!expiryDate) return null;
	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const expiry = new Date(expiryDate);
	expiry.setHours(0, 0, 0, 0);
	return Math.ceil((expiry - today) / (1000 * 60 * 60 * 24));
}

function normalizeLocation(location) {
	// Giữ nguyên từng vị trí, không gộp nganlanh vào tulanh
	const valid = ["tulanh", "ngandong", "nganlanh"];
	return valid.includes(location) ? location : "tulanh";
}

async function updateHomeStats() {
	const fridgeCountEls = document.querySelectorAll(".card-fridge .s-count");
	const freezerCountEls = document.querySelectorAll(".card-freezer .s-count");
	const pantryCountEls = document.querySelectorAll(".card-pantry .s-count");
	const expiringCountEl = document.querySelector(".card-expiring .u-count");
	const statsCountEl = document.querySelector(".card-stats .u-count");
	const emptyFillEl = document.querySelector(".semi-circle-fill");
	const capInfoText = document.querySelector(".cap-info h2");
	const circleInner = document.querySelector(".circle-inner");

	const nutritionLegendItems = document.querySelectorAll(".nutrition-chart-card .leg-item");

	const emitStats = (counts, usedPercent, totalCapacity) => {
		document.dispatchEvent(
			new CustomEvent("homeStatsUpdated", {
				detail: {
					counts,
					usedPercent,
					totalCapacity
				}
			})
		);
	};

	const resetDashboard = () => {
		const emptyCounts = {
			tulanh: 0,
			ngandong: 0,
			nganlanh: 0,
			expiring: 0,
			total: 0,
			protein: 0,
			veggies: 0,
			carbs: 0
		};

		fridgeCountEls.forEach((el) => (el.textContent = "00")); // TỦ LẠNH
		freezerCountEls.forEach((el) => (el.textContent = "00")); // NGĂN ĐÁ
		pantryCountEls.forEach((el) => (el.textContent = "00")); // NGĂN LẠNH
		if (expiringCountEl) expiringCountEl.textContent = "0";
		if (statsCountEl) statsCountEl.textContent = "0";
		if (capInfoText) capInfoText.textContent = "0%";
		if (circleInner) circleInner.textContent = "0";
		if (emptyFillEl) emptyFillEl.style.transform = "rotate(0deg)";
		if (nutritionLegendItems.length >= 3) {
			nutritionLegendItems[0].innerHTML = '<span class="dot c-red"></span> 0 <br /><small data-i18n="db-protein">Đạm</small>';
			nutritionLegendItems[1].innerHTML = '<span class="dot c-teal"></span> 0 <br /><small data-i18n="db-veggies">Rau củ</small>';
			nutritionLegendItems[2].innerHTML = '<span class="dot c-pink"></span> 0 <br /><small data-i18n="db-carbs">Tinh bột/ Gia vị</small>';
		}

		emitStats(emptyCounts, 0, 0);
	};

	const auth = window.sakedoApi.getStoredAuth();
	if (!auth?.access_token) {
		resetDashboard();
		return;
	}

	try {
		const items = await window.sakedoApi.getFridgeItems();
		const counts = {
			tulanh: 0,
			ngandong: 0,
			nganlanh: 0,
			expiring: 0,
			total: items.length,
			protein: 0,
			veggies: 0,
			carbs: 0
		};

		items.forEach((item) => {
			const location = normalizeLocation(item.location);
			if (location === "tulanh") counts.tulanh += 1;
			else if (location === "ngandong") counts.ngandong += 1;
			else if (location === "nganlanh") counts.nganlanh += 1;
			// Mỗi item chỉ được đếm vào đúng 1 ngăn

			const daysLeft = getDaysLeft(item.expiry_date);
			if (daysLeft !== null && daysLeft <= 3) counts.expiring += 1;

			const category = (item.category || "khac").toLowerCase();
			if (category === "thit") counts.protein += Number(item.quantity) || 1;
			else if (category === "traicay") counts.veggies += Number(item.quantity) || 1;
			else counts.carbs += Number(item.quantity) || 1;
		});

		// Card 1 – TỦ LẠNH: chỉ đếm items có location = tulanh
		fridgeCountEls.forEach((el) => animateCounter(el, counts.tulanh, 800, "padded"));
		// Card 2 – NGĂN ĐÁ: chỉ đếm items có location = ngandong
		freezerCountEls.forEach((el) => animateCounter(el, counts.ngandong, 800, "padded"));
		// Card 3 – NGĂN LẠNH: chỉ đếm items có location = nganlanh
		pantryCountEls.forEach((el) => animateCounter(el, counts.nganlanh, 800, "padded"));
		if (expiringCountEl) animateCounter(expiringCountEl, counts.expiring, 700);
		if (statsCountEl) animateCounter(statsCountEl, counts.total, 700);

		// Add pulsing glow when there are expiring items
		const expiringCard = document.querySelector(".card-expiring");
		if (expiringCard) {
			if (counts.expiring > 0) {
				expiringCard.classList.add("has-expiring");
			} else {
				expiringCard.classList.remove("has-expiring");
			}
		}

		const totalCapacity = 20;
		const usedPercent = Math.min(100, Math.round((counts.total / totalCapacity) * 100));
		const freePercent = 100 - usedPercent;

		// Animate percentage text
		if (capInfoText) {
			let startVal = 0;
			const endVal = freePercent;
			const dur = 800;
			const t0 = performance.now();
			const animPct = (now) => {
				const p = Math.min((now - t0) / dur, 1);
				const eased = 1 - Math.pow(1 - p, 3);
				capInfoText.textContent = `${Math.round(startVal + (endVal - startVal) * eased)}%`;
				if (p < 1) requestAnimationFrame(animPct);
			};
			requestAnimationFrame(animPct);
		}

		if (circleInner) animateCounter(circleInner, counts.total, 800);

		// Animate semi-circle fill
		if (emptyFillEl) {
			const targetRot = 1.8 * usedPercent;
			let startTime = null;
			const animFill = (now) => {
				if (!startTime) startTime = now;
				const p = Math.min((now - startTime) / 900, 1);
				const eased = 1 - Math.pow(1 - p, 3);
				emptyFillEl.style.transform = `rotate(${targetRot * eased}deg)`;
				if (p < 1) requestAnimationFrame(animFill);
			};
			requestAnimationFrame(animFill);
		}

		if (nutritionLegendItems.length >= 3) {
			nutritionLegendItems[0].innerHTML = `<span class="dot c-red"></span> ${counts.protein} <br /><small data-i18n="db-protein">Đạm</small>`;
			nutritionLegendItems[1].innerHTML = `<span class="dot c-teal"></span> ${counts.veggies} <br /><small data-i18n="db-veggies">Rau củ</small>`;
			nutritionLegendItems[2].innerHTML = `<span class="dot c-pink"></span> ${counts.carbs} <br /><small data-i18n="db-carbs">Tinh bột/ Gia vị</small>`;
		}

		emitStats(counts, usedPercent, totalCapacity);
	} catch (error) {
		resetDashboard();
	}
}
