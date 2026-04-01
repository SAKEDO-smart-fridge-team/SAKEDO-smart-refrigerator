const API_BASE_URL = localStorage.getItem("sakedo_api_base_url") || "http://127.0.0.1:8000";
const GOOGLE_CLIENT_ID =
	window.SAKEDO_GOOGLE_CLIENT_ID ||
	"";
let resolvedGoogleClientId = GOOGLE_CLIENT_ID;

async function apiRequest(path, options = {}) {
	const response = await fetch(`${API_BASE_URL}${path}`, {
		headers: {
			"Content-Type": "application/json",
			...(options.headers || {})
		},
		...options
	});

	const responseText = await response.text();
	let responseData = null;

	try {
		responseData = responseText ? JSON.parse(responseText) : null;
	} catch (error) {
		responseData = null;
	}

	if (!response.ok) {
		const detail = responseData?.detail || "Đã xảy ra lỗi từ máy chủ.";
		throw new Error(detail);
	}

	return responseData;
}

function registerUser(payload) {
	return apiRequest("/api/register", {
		method: "POST",
		body: JSON.stringify(payload)
	});
}

function loginUser(payload) {
	return apiRequest("/api/login", {
		method: "POST",
		body: JSON.stringify(payload)
	});
}

function loginWithGoogle(payload) {
	return apiRequest("/api/login/google", {
		method: "POST",
		body: JSON.stringify(payload)
	});
}

function forgotPassword(payload) {
	return apiRequest("/api/forgot-password", {
		method: "POST",
		body: JSON.stringify(payload)
	});
}

function resetPassword(payload) {
	return apiRequest("/api/reset-password", {
		method: "POST",
		body: JSON.stringify(payload)
	});
}

async function getPublicConfig() {
	return apiRequest("/api/config/public", {
		method: "GET"
	});
}

async function getGoogleClientId() {
	if (resolvedGoogleClientId) {
		return resolvedGoogleClientId;
	}

	try {
		const config = await getPublicConfig();
		const clientId = (config?.google_client_id || "").trim();
		if (clientId) {
			resolvedGoogleClientId = clientId;
		}
	} catch (error) {
		return "";
	}

	return resolvedGoogleClientId;
}

function getStoredAuth() {
	const raw = localStorage.getItem("sakedo_auth");
	if (!raw) return null;

	try {
		return JSON.parse(raw);
	} catch (error) {
		localStorage.removeItem("sakedo_auth");
		return null;
	}
}

function saveAuth(authData) {
	localStorage.setItem("sakedo_auth", JSON.stringify(authData));
}

function clearAuth() {
	localStorage.removeItem("sakedo_auth");
}

window.sakedoApi = {
	registerUser,
	loginUser,
	loginWithGoogle,
	forgotPassword,
	resetPassword,
	getPublicConfig,
	getGoogleClientId,
	getStoredAuth,
	saveAuth,
	clearAuth,
	API_BASE_URL,
	GOOGLE_CLIENT_ID
};
