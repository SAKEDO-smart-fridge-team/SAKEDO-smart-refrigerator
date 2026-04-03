(function () {
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const forgotForm = document.getElementById("forgot-form");
  const resetForm = document.getElementById("reset-form");
  const messageEl = document.getElementById("auth-message");
  const googleButtonHost = document.getElementById("google-signin-button");
  const resetTokenInput = document.getElementById("reset-token");
  const params = new URLSearchParams(window.location.search);

  function showMessage(message, type) {
    if (!messageEl) return;

    messageEl.textContent = message || "";
    messageEl.classList.remove("error", "success");

    if (type) {
      messageEl.classList.add(type);
    }
  }

  function decodeJwtPayload(token) {
    try {
      const payloadBase64 = token.split(".")[1];
      if (!payloadBase64) return null;

      const base64 = payloadBase64.replace(/-/g, "+").replace(/_/g, "/");
      const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
      return JSON.parse(atob(padded));
    } catch (error) {
      return null;
    }
  }

  function setButtonLoading(form, loading) {
    const submitBtn = form.querySelector("button[type='submit']");
    if (!submitBtn) return;

    submitBtn.disabled = loading;
    submitBtn.style.opacity = loading ? "0.7" : "1";
    submitBtn.style.cursor = loading ? "not-allowed" : "pointer";
  }

  async function handleLogin(event) {
    event.preventDefault();

    const email = loginForm.email.value.trim();
    const password = loginForm.password.value;

    if (!email || !password) {
      showMessage("Vui lòng nhập đầy đủ email và mật khẩu.", "error");
      return;
    }

    try {
      setButtonLoading(loginForm, true);
      showMessage("Đang đăng nhập...", "success");

      const token = await window.sakedoApi.loginUser({ email, password });
      const authPayload = {
        access_token: token.access_token,
        token_type: token.token_type,
        user: token.user || { email }
      };

      window.sakedoApi.saveAuth(authPayload);
      showMessage("Đăng nhập thành công, đang chuyển trang...", "success");

      setTimeout(() => {
        window.location.href = "onboarding.html";
      }, 500);
    } catch (error) {
      showMessage(error.message || "Đăng nhập thất bại.", "error");
    } finally {
      setButtonLoading(loginForm, false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();

    const payload = {
      full_name: registerForm.full_name.value.trim(),
      phone: registerForm.phone.value.trim(),
      email: registerForm.email.value.trim(),
      password: registerForm.password.value
    };

    if (!payload.full_name || !payload.phone || !payload.email || !payload.password) {
      showMessage("Vui lòng điền đầy đủ thông tin đăng ký.", "error");
      return;
    }

    try {
      setButtonLoading(registerForm, true);
      showMessage("Đang tạo tài khoản...", "success");

      await window.sakedoApi.registerUser(payload);
      showMessage("Đăng ký thành công, đang chuyển sang đăng nhập...", "success");
      setTimeout(() => {
        const nextUrl = `login.html?registered=1&email=${encodeURIComponent(payload.email)}`;
        window.location.href = nextUrl;
      }, 600);
    } catch (error) {
      showMessage(error.message || "Đăng ký thất bại.", "error");
    } finally {
      setButtonLoading(registerForm, false);
    }
  }

  async function handleGoogleCredential(response) {
    const idToken = response?.credential;
    if (!idToken) {
      showMessage("Không nhận được token Google.", "error");
      return;
    }

    try {
      showMessage("Đang đăng nhập Google...", "success");

      const token = await window.sakedoApi.loginWithGoogle({ id_token: idToken });
      const googlePayload = decodeJwtPayload(idToken) || {};

      window.sakedoApi.saveAuth({
        access_token: token.access_token,
        token_type: token.token_type,
        user: {
          email: googlePayload.email || "",
          full_name: googlePayload.name || ""
        },
        provider: "google"
      });

      showMessage("Đăng nhập Google thành công, đang chuyển trang...", "success");
      setTimeout(() => {
        window.location.href = "onboarding.html";
      }, 500);
    } catch (error) {
      showMessage(error.message || "Đăng nhập Google thất bại.", "error");
    }
  }

  async function handleForgotPassword(event) {
    event.preventDefault();

    const email = forgotForm.email.value.trim();
    if (!email) {
      showMessage("Vui lòng nhập email để đặt lại mật khẩu.", "error");
      return;
    }

    try {
      setButtonLoading(forgotForm, true);
      showMessage("Đang gửi yêu cầu đặt lại mật khẩu...", "success");

      const response = await window.sakedoApi.forgotPassword({ email });
      const resetUrl = response?.reset_url || "";

      if (resetUrl) {
        showMessage("Đã tạo link đặt lại mật khẩu. Đang chuyển hướng...", "success");
        setTimeout(() => {
          window.location.href = resetUrl;
        }, 700);
      } else {
        showMessage("Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu.", "success");
      }
    } catch (error) {
      showMessage(error.message || "Không thể gửi yêu cầu đặt lại mật khẩu.", "error");
    } finally {
      setButtonLoading(forgotForm, false);
    }
  }

  async function handleResetPassword(event) {
    event.preventDefault();

    const token = (resetTokenInput?.value || "").trim();
    const newPassword = resetForm.new_password.value;
    const confirmPassword = resetForm.confirm_password.value;

    if (!token) {
      showMessage("Thiếu token đặt lại mật khẩu.", "error");
      return;
    }

    if (!newPassword || !confirmPassword) {
      showMessage("Vui lòng nhập đầy đủ mật khẩu mới.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("Mật khẩu xác nhận không khớp.", "error");
      return;
    }

    try {
      setButtonLoading(resetForm, true);
      showMessage("Đang cập nhật mật khẩu...", "success");

      await window.sakedoApi.resetPassword({ token, new_password: newPassword });
      showMessage("Đặt lại mật khẩu thành công. Đang chuyển sang đăng nhập...", "success");

      setTimeout(() => {
        window.location.href = "login.html?reset=1";
      }, 800);
    } catch (error) {
      showMessage(error.message || "Không thể đặt lại mật khẩu.", "error");
    } finally {
      setButtonLoading(resetForm, false);
    }
  }

  async function initGoogleLogin() {
    if (!googleButtonHost) return;

    const clientId = await window.sakedoApi.getGoogleClientId();
    if (!clientId) {
      googleButtonHost.textContent = "Thiếu GOOGLE_CLIENT_ID. Hãy cấu hình trước khi dùng Google Login.";
      googleButtonHost.classList.add("google-signin-missing");
      return;
    }

    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      googleButtonHost.textContent = "Không tải được Google Identity Services.";
      googleButtonHost.classList.add("google-signin-missing");
      return;
    }

    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: handleGoogleCredential
    });

    googleButtonHost.innerHTML = "";
    window.google.accounts.id.renderButton(googleButtonHost, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "signin_with",
      shape: "pill",
      width: 260
    });
  }

  if (loginForm) {
    if (params.get("reset") === "1") {
      showMessage("Mật khẩu đã được cập nhật. Vui lòng đăng nhập lại.", "success");
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, "login.html");
      }
    }

    if (params.get("registered") === "1") {
      const email = params.get("email") || "";
      if (email && loginForm.email) {
        loginForm.email.value = email;
      }
      showMessage("Tạo tài khoản thành công. Vui lòng đăng nhập để tiếp tục.", "success");
      if (window.history.replaceState) {
        window.history.replaceState({}, document.title, "login.html");
      }
    }

    loginForm.addEventListener("submit", handleLogin);
  }

  if (registerForm) {
    registerForm.addEventListener("submit", handleRegister);
  }

  if (forgotForm) {
    forgotForm.addEventListener("submit", handleForgotPassword);
  }

  if (resetForm) {
    const queryToken = (params.get("token") || "").trim();
    if (resetTokenInput && queryToken) {
      resetTokenInput.value = queryToken;
    }

    resetForm.addEventListener("submit", handleResetPassword);
  }

  initGoogleLogin();
})();
