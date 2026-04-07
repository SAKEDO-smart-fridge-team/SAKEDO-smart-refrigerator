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

		function updateTopbarName(name) {
			if (welcomeNameEl) {
				welcomeNameEl.textContent = `Xin chào, ${name || "Khách hàng"}!`;
			}
		}

		const user = auth.user || {};
		const emailPrefix = (user.email || "").split("@")[0] || "Bạn";
		const displayName = user.full_name || user.name || emailPrefix;

		updateTopbarName(displayName);

		// Lắng nghe sự kiện cập nhật từ trang Profile
		document.addEventListener("userUpdated", (e) => {
			updateTopbarName(e.detail.full_name);
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
	if (location === "nganlanh") return "tulanh";
	return location || "tulanh";
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

		fridgeCountEls.forEach((el) => (el.textContent = "00"));
		freezerCountEls.forEach((el) => (el.textContent = "00"));
		pantryCountEls.forEach((el) => (el.textContent = "00"));
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

			const daysLeft = getDaysLeft(item.expiry_date);
			if (daysLeft !== null && daysLeft <= 3) counts.expiring += 1;

			const category = (item.category || "khac").toLowerCase();
			if (category === "thit") counts.protein += Number(item.quantity) || 1;
			else if (category === "traicay") counts.veggies += Number(item.quantity) || 1;
			else counts.carbs += Number(item.quantity) || 1;
		});

		fridgeCountEls.forEach((el) => (el.textContent = String(counts.tulanh + counts.nganlanh).padStart(2, "0")));
		freezerCountEls.forEach((el) => (el.textContent = String(counts.ngandong).padStart(2, "0")));
		pantryCountEls.forEach((el) => (el.textContent = String(counts.carbs).padStart(2, "0")));
		if (expiringCountEl) expiringCountEl.textContent = String(counts.expiring);
		if (statsCountEl) statsCountEl.textContent = String(counts.total);

		const totalCapacity = 20;
		const usedPercent = Math.min(100, Math.round((counts.total / totalCapacity) * 100));
		const freePercent = 100 - usedPercent;
		if (capInfoText) capInfoText.textContent = `${freePercent}%`;
		if (circleInner) circleInner.textContent = String(counts.total);
		if (emptyFillEl) emptyFillEl.style.transform = `rotate(${1.8 * usedPercent}deg)`;

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
