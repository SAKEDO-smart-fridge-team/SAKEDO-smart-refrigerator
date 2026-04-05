document.addEventListener("DOMContentLoaded", () => {
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
		const emailPrefix = (auth.user?.email || "").split("@")[0] || "Bạn";
		const displayName = auth.user?.full_name || emailPrefix;

		if (welcomeNameEl) {
			welcomeNameEl.textContent = `Xin chào, ${displayName}!`;
		}
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

function updateHomeStats() {
	const inventory = JSON.parse(localStorage.getItem("sakedo_inventory") || "{}");
	const itemCount = Object.keys(inventory).length;
	
	const fridgeCountEl = document.querySelector(".card-fridge .s-count");
	if (fridgeCountEl) {
		fridgeCountEl.textContent = itemCount.toString().padStart(2, '0');
	}

  // Update percentages or other cards if needed
  const emptyFillEl = document.querySelector(".semi-circle-fill");
  const capInfoText = document.querySelector(".cap-info h2");
  if (emptyFillEl && capInfoText) {
    const totalCapacity = 20; // Giả sử tủ chứa được tối đa 20 loại món
    const usedPercent = Math.min(100, Math.round((itemCount / totalCapacity) * 100));
    const freePercent = 100 - usedPercent;

    capInfoText.textContent = `${freePercent}%`;
    emptyFillEl.style.transform = `rotate(${1.8 * usedPercent}deg)`; // CSS semi-circle logic placeholder
  }
}
