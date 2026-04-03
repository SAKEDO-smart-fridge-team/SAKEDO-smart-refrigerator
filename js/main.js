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

	// Giao diện Sáng / Tối
	const lightModeBtn = document.querySelector(".light-mode");
	const darkModeBtn = document.querySelector(".dark-mode");

	if (localStorage.getItem("sakedo-theme") === "dark") {
		document.body.classList.add("dark-theme");
		if (darkModeBtn) darkModeBtn.classList.add("active");
		if (lightModeBtn) lightModeBtn.classList.remove("active");
	} else {
		if (lightModeBtn) lightModeBtn.classList.add("active");
	}

	if (lightModeBtn && darkModeBtn) {
		lightModeBtn.addEventListener("click", () => {
			document.body.classList.remove("dark-theme");
			lightModeBtn.classList.add("active");
			darkModeBtn.classList.remove("active");
			localStorage.setItem("sakedo-theme", "light");
		});

		darkModeBtn.addEventListener("click", () => {
			document.body.classList.add("dark-theme");
			darkModeBtn.classList.add("active");
			lightModeBtn.classList.remove("active");
			localStorage.setItem("sakedo-theme", "dark");
		});
	}

	// Tự động tải trang chủ (home) khi mở app
	if (typeof navigate === "function") {
		navigate("home", document.querySelector(".nav-item"));
	}
});
