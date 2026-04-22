(function () {
  let adminUiReady = false;
  let searchDebounceTimer = null;
  let latestRequestId = 0;
  const state = {
    page: 1,
    pageSize: 10,
    totalPages: 1,
    q: "",
    role: "all",
    auditPage: 1,
    auditPageSize: 8,
    loading: false,
  };

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

  function setPageInfo(page, totalPages, total) {
    const pageInfo = document.getElementById("admin-page-info");
    if (pageInfo) {
      pageInfo.textContent = `${page} / ${Math.max(totalPages, 1)} (${total || 0})`;
    }
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

  function renderAuditLogs(items) {
    const tbody = document.getElementById("admin-audit-body");
    if (!tbody) return;

    if (!items.length) {
      tbody.innerHTML =
        '<tr><td colspan="4" class="admin-empty" data-i18n="admin-no-audit">Chưa có lịch sử thao tác.</td></tr>';
      window.sakedoI18n?.translatePage();
      return;
    }

    tbody.innerHTML = "";
    items.forEach((entry) => {
      const tr = document.createElement("tr");
      const createdAt = entry.created_at ? new Date(entry.created_at).toLocaleString() : "-";
      const adminEmail = entry?.admin?.email || "-";
      const targetEmail = entry?.target_user?.email || "-";
      const action = String(entry.action || "-").replaceAll("_", " ");

      tr.innerHTML = `
        <td>${createdAt}</td>
        <td>${adminEmail}</td>
        <td class="admin-audit-action">${action}</td>
        <td>${targetEmail}</td>
      `;
      tbody.appendChild(tr);
    });
  }

  async function loadAdminData() {
    const requestId = ++latestRequestId;

    state.loading = true;

    try {
      const [overview, usersResponse, auditResponse] = await Promise.all([
        window.sakedoApi.getAdminOverview(),
        window.sakedoApi.getAdminUsers({
          q: state.q,
          role: state.role,
          page: state.page,
          pageSize: state.pageSize,
        }),
        window.sakedoApi.getAdminAuditLogs({
          page: state.auditPage,
          pageSize: state.auditPageSize,
        }),
      ]);

      // Ignore stale responses when a newer request has been sent.
      if (requestId !== latestRequestId) {
        return;
      }

      setMetric("metric-total-users", overview.total_users);
      setMetric("metric-total-items", overview.total_items);
      setMetric("metric-total-favorites", overview.total_favorites);
      setMetric("metric-expiring", overview.expiring_soon);

      const users = usersResponse?.items || [];
      state.totalPages = usersResponse?.total_pages || 1;
      renderUsers(users);
      setPageInfo(usersResponse?.page || state.page, state.totalPages, usersResponse?.total || 0);
      renderAuditLogs(auditResponse?.items || []);
    } catch (error) {
      console.error("[ADMIN]", error);
      const tbody = document.getElementById("admin-users-body");
      if (tbody) {
        tbody.innerHTML = `<tr><td colspan="6" class="admin-empty">${error.message || "Không tải được dữ liệu admin."}</td></tr>`;
      }
    } finally {
      state.loading = false;
    }
  }

  function bindAdminPageEvents() {
    const refreshBtn = document.getElementById("admin-refresh-btn");
    const searchInput = document.getElementById("admin-search-input");
    const roleFilter = document.getElementById("admin-role-filter");
    const prevBtn = document.getElementById("admin-prev-page");
    const nextBtn = document.getElementById("admin-next-page");

    if (refreshBtn && !refreshBtn.dataset.bound) {
      refreshBtn.dataset.bound = "1";
      refreshBtn.addEventListener("click", () => {
        state.page = 1;
        state.auditPage = 1;
        loadAdminData();
      });
    }

    if (searchInput && !searchInput.dataset.bound) {
      searchInput.dataset.bound = "1";
      searchInput.addEventListener("input", (event) => {
        state.q = event.target.value || "";
        state.page = 1;

        if (searchDebounceTimer) {
          clearTimeout(searchDebounceTimer);
        }

        searchDebounceTimer = setTimeout(() => {
          loadAdminData();
        }, 350);
      });
    }

    if (roleFilter && !roleFilter.dataset.bound) {
      roleFilter.dataset.bound = "1";
      roleFilter.addEventListener("change", (event) => {
        state.role = event.target.value || "all";
        state.page = 1;
        loadAdminData();
      });
    }

    if (prevBtn && !prevBtn.dataset.bound) {
      prevBtn.dataset.bound = "1";
      prevBtn.addEventListener("click", () => {
        if (state.page <= 1) return;
        state.page -= 1;
        loadAdminData();
      });
    }

    if (nextBtn && !nextBtn.dataset.bound) {
      nextBtn.dataset.bound = "1";
      nextBtn.addEventListener("click", () => {
        if (state.page >= state.totalPages) return;
        state.page += 1;
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
      state.page = 1;
      state.auditPage = 1;
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
