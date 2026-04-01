document.addEventListener("DOMContentLoaded", () => {
	const auth = window.sakedoApi.getStoredAuth();

	if (!auth?.access_token) {
		window.location.href = "login.html";
		return;
	}

	const welcomeNameEl = document.getElementById("welcome-name");
	const displayName = auth.user?.full_name || auth.user?.email || "Bạn";

	if (welcomeNameEl) {
		welcomeNameEl.textContent = `Xin chào, ${displayName}!`;
	}

	const logoutLink = document.getElementById("logout-link");
	if (logoutLink) {
		logoutLink.addEventListener("click", (event) => {
			event.preventDefault();
			window.sakedoApi.clearAuth();
			window.location.href = "login.html";
		});
	}
});
