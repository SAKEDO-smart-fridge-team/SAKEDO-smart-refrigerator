(function () {
  let adminUiReady = false;

  function formatProvider(provider) {
    if (!provider) return "password";
    return provider;
  }

  function setMetric(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = String(value ?? 0);
  }

  async function loadOverview() {
    const overview = await window.sakedoApi.getAdminOverview();
    setMetric("metric-total-users", overview.total_users);
    setMetric("metric-total-items", overview.total_items);
    setMetric("metric-total-favorites", overview.total_favorites);
    setMetric("metric-expiring", overview.expiring_soon);
  }

  function createActionButton(label, handler, className = "") {
    const btn = document.createElement("button");
    btn.textContent = label;
    if (className) btn.className = className;
    btn.addEventListener("click", handler);
    return btn;
  }

  async function toggleAdminRole(user) {
    const nextRole = !user.is_admin;
    const message = nextRole
      ? "Cấp quyền admin cho user này?"
      : "Gỡ quyền admin của user này?";
    if (!window.confirm(message)) return;

    await window.sakedoApi.updateUserAdminRole(user.id, nextRole);
    await loadAdminData();
  }

  async function deleteUser(user) {
    const ok = window.confirm(`Xóa user ${user.email}? Hành động này sẽ xóa toàn bộ dữ liệu liên quan.`);
    if (!ok) return;

    await window.sakedoApi.deleteUserByAdmin(user.id);
    await loadAdminData();
  }

  function renderUsers(users) {
    const tbody = document.getElementById("admin-users-body");
    if (!tbody) return;

    if (!users.length) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="admin-empty" data-i18n="admin-no-data">Chưa có dữ liệu người dùng.</td></tr>';
      window.sakedoI18n?.translatePage();
      return;
    }

    tbody.innerHTML = "";
    users.forEach((user) => {
      const tr = document.createElement("tr");

      const roleLabel = user.is_admin
        ? (window.sakedoI18n?.translate("admin-role-admin") || "Admin")
        : (window.sakedoI18n?.translate("admin-role-user") || "User");

      tr.innerHTML = `
        <td>${user.full_name || "-"}</td>
        <td>${user.email || "-"}</td>
        <td>${formatProvider(user.auth_provider)}</td>
        <td>${user.total_items || 0}</td>
        <td><span class="admin-pill ${user.is_admin ? "admin" : ""}">${roleLabel}</span></td>
        <td class="admin-actions"></td>
      `;

      const actionsCell = tr.querySelector(".admin-actions");
      const promoteText = user.is_admin
        ? (window.sakedoI18n?.translate("admin-action-demote") || "Gỡ admin")
        : (window.sakedoI18n?.translate("admin-action-promote") || "Cấp admin");
      const deleteText = window.sakedoI18n?.translate("admin-action-delete") || "Xóa user";

      actionsCell.appendChild(createActionButton(promoteText, () => toggleAdminRole(user)));
      actionsCell.appendChild(createActionButton(deleteText, () => deleteUser(user), "danger"));
      tbody.appendChild(tr);
    });
  }

  async function loadAdminData() {
    try {
      await loadOverview();
      const users = await window.sakedoApi.getAdminUsers();
      renderUsers(users || []);
    } catch (error) {
      console.error("[ADMIN]", error);
      const tbody = document.getElementById("admin-users-body");
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">${error.message || "Không tải được dữ liệu admin."}</td></tr>`;
      }
    }
  }

  function bindAdminPageEvents() {
    const refreshBtn = document.getElementById("admin-refresh-btn");
    if (refreshBtn && !refreshBtn.dataset.bound) {
      refreshBtn.dataset.bound = "1";
      refreshBtn.addEventListener("click", () => {
        loadAdminData();
      });
    }
  }

  async function revealAdminNavIfAllowed() {
    const nav = document.getElementById("admin-nav-item");
    if (!nav) return;

    const auth = window.sakedoApi.getStoredAuth();
    if (!auth?.access_token) {
      nav.style.display = "none";
      return;
    }

    try {
      await window.sakedoApi.getAdminMe();
      nav.style.display = "flex";
    } catch (error) {
      nav.style.display = "none";
    }
  }

  document.addEventListener("DOMContentLoaded", async () => {
    await revealAdminNavIfAllowed();
  });

  document.addEventListener("pageChanged", (event) => {
    if (event?.detail?.page !== "admin") {
      adminUiReady = false;
      return;
    }

    if (!adminUiReady) {
      bindAdminPageEvents();
      loadAdminData();
      adminUiReady = true;
    }
  });

  document.addEventListener("languageChanged", () => {
    const currentPage = document.querySelector("#app-root .admin-page");
    if (currentPage) {
      loadAdminData();
    }
  });
})();
