import { appUrl } from "./env.js";
import { formatCurrency, formatDate, formatNumber, getInitials } from "./format.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function normalizeText(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("đ", "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getStatusTone(value) {
  const normalized = normalizeText(value);

  if (normalized.includes("hoan thanh")) {
    return "success";
  }

  if (normalized.includes("cho thi")) {
    return "warning";
  }

  if (normalized.includes("dang hoc") || normalized.includes("moi dang ky")) {
    return "info";
  }

  return "danger";
}

function getDebtTone(value) {
  return Number(value || 0) > 0 ? "danger" : "success";
}

function renderStatusBadge(label, tone) {
  return `<span class="status-badge status-badge--${tone}">${escapeHtml(label || "--")}</span>`;
}

function renderNavLink(item, activeNav) {
  const isActive = item.id === activeNav;

  return `
    <a class="sidebar__nav-link ${isActive ? "is-active" : ""}" href="${item.href}">
      <span class="sidebar__icon">${item.icon}</span>
      <span>${item.label}</span>
    </a>
  `;
}

function renderTopAction(action) {
  const variantClass = action.variant === "secondary" ? "button-secondary" : "button-primary";

  return `
    <a class="button ${variantClass} button-small" href="${action.href}">
      ${escapeHtml(action.label)}
    </a>
  `;
}

function navItems() {
  return [
    {
      id: "overview",
      icon: "DB",
      label: "Dashboard",
      href: appUrl("/dashboard/")
    },
    {
      id: "students",
      icon: "HV",
      label: "Hoc vien",
      href: appUrl("/dashboard/students/")
    }
  ];
}

function renderMoneyStack(student) {
  return `
    <div class="money-stack">
      <strong>${formatCurrency(student.tuitionTotal)}</strong>
      <span>Da dong ${formatCurrency(student.tuitionPaid)}</span>
      <span class="${student.tuitionDue > 0 ? "text-danger" : "text-success"}">
        Con thieu ${formatCurrency(student.tuitionDue)}
      </span>
    </div>
  `;
}

export function mountDashboardLayout({
  activeNav,
  pageTitle,
  pageSubtitle,
  actions = [],
  admin = {},
  onLogout
}) {
  const app = document.querySelector("#app");

  app.innerHTML = `
    <div class="dashboard-shell">
      <div class="sidebar-overlay" data-sidebar-overlay></div>

      <aside class="sidebar">
        <a class="sidebar__brand" href="${appUrl("/dashboard/")}">
          <span class="sidebar__brand-badge">TL</span>
          <span>
            <strong>ThayLong</strong>
            <small>Quan ly trung tam day lai</small>
          </span>
        </a>

        <div>
          <p class="sidebar__caption">Dieu huong</p>
          <nav class="sidebar__nav">
            ${navItems()
              .map((item) => renderNavLink(item, activeNav))
              .join("")}
          </nav>
        </div>

        <div class="sidebar__spacer"></div>

        <section class="admin-panel">
          <div class="admin-panel__header">
            <span class="admin-panel__avatar" data-admin-avatar>${escapeHtml(
              getInitials(admin.fullName)
            )}</span>
            <div>
              <p class="admin-panel__name" data-admin-name>${escapeHtml(
                admin.fullName || "Admin"
              )}</p>
              <p class="admin-panel__role" data-admin-role>${escapeHtml(
                admin.role || "Quan ly trung tam"
              )}</p>
            </div>
          </div>

          <button class="button button-secondary button-block button-small" type="button" data-logout>
            Dang xuat
          </button>
        </section>
      </aside>

      <div class="dashboard-main">
        <header class="topbar">
          <div class="topbar__left">
            <button class="topbar__mobile-toggle" type="button" data-sidebar-toggle>
              ☰
            </button>

            <div>
              <h1 class="topbar__title">${escapeHtml(pageTitle)}</h1>
              <p class="topbar__subtitle">${escapeHtml(pageSubtitle)}</p>
            </div>
          </div>

          <div class="topbar__actions">
            ${actions.map((action) => renderTopAction(action)).join("")}
          </div>
        </header>

        <main class="page-content" data-page-content>
          <section class="section-card">
            <div class="empty-state">
              <div>
                <h3>Dang tai du lieu</h3>
                <p>He thong dang lay du lieu hoc vien va hoc phi.</p>
              </div>
            </div>
          </section>
        </main>
      </div>
    </div>
  `;

  const overlay = app.querySelector("[data-sidebar-overlay]");
  const toggleButton = app.querySelector("[data-sidebar-toggle]");
  const logoutButton = app.querySelector("[data-logout]");

  toggleButton?.addEventListener("click", () => {
    document.body.classList.toggle("sidebar-open");
  });

  overlay?.addEventListener("click", () => {
    document.body.classList.remove("sidebar-open");
  });

  logoutButton?.addEventListener("click", () => {
    document.body.classList.remove("sidebar-open");
    onLogout?.();
  });

  return {
    content: app.querySelector("[data-page-content]"),
    adminName: app.querySelector("[data-admin-name]"),
    adminRole: app.querySelector("[data-admin-role]"),
    adminAvatar: app.querySelector("[data-admin-avatar]")
  };
}

export function updateAdminPanel(layoutRefs, admin) {
  if (!layoutRefs || !admin) {
    return;
  }

  layoutRefs.adminName.textContent = admin.fullName || "Admin";
  layoutRefs.adminRole.textContent = admin.role || "Quan ly trung tam";
  layoutRefs.adminAvatar.textContent = getInitials(admin.fullName);
}

export function renderStatsGrid(summary = {}) {
  const items = [
    {
      label: "Tong hoc vien",
      value: summary.totalStudents,
      hint: "Tong so ho so dang duoc quan ly"
    },
    {
      label: "Dang hoc",
      value: summary.activeLearning,
      hint: "Hoc vien dang theo tien do dao tao"
    },
    {
      label: "Cho thi",
      value: summary.waitingExam,
      hint: "Hoc vien da san sang thi sat hach"
    },
    {
      label: "Con hoc phi",
      value: summary.feeDebt,
      hint: "So hoc vien con cong no hoc phi"
    }
  ];

  return `
    <section class="stats-grid">
      ${items
        .map(
          (item) => `
            <article class="stat-card">
              <span class="stat-card__label">${escapeHtml(item.label)}</span>
              <p class="stat-card__value">${formatNumber(item.value)}</p>
              <p class="stat-card__hint">${escapeHtml(item.hint)}</p>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

export function renderStudentTable(students = []) {
  const rows = students
    .map(
      (student) => `
        <tr>
          <td>${escapeHtml(student.studentId)}</td>
          <td>
            <div class="student-meta">
              <strong class="student-name">${escapeHtml(student.fullName || "--")}</strong>
              <span class="student-subtext">${escapeHtml(student.phone || "--")}</span>
              <span class="student-subtext">Ngay sinh ${escapeHtml(
                formatDate(student.birthDate)
              )}</span>
            </div>
          </td>
          <td>
            <div class="student-meta">
              <strong>${escapeHtml(student.licenseClass || "--")}</strong>
              <span class="student-subtext">${escapeHtml(student.sessionType || "--")}</span>
            </div>
          </td>
          <td>${renderStatusBadge(student.status, getStatusTone(student.status))}</td>
          <td>
            <div class="student-meta">
              <strong>${escapeHtml(student.datVehicle || "--")}</strong>
              <span class="student-subtext">${formatNumber(student.datKm)} km DAT</span>
            </div>
          </td>
          <td>${renderMoneyStack(student)}</td>
          <td>${renderStatusBadge(
            Number(student.tuitionDue) > 0 ? "Con thieu" : "Da du",
            getDebtTone(student.tuitionDue)
          )}</td>
          <td>
            <div class="student-meta">
              <strong>${formatDate(student.registerDate)}</strong>
              <span class="student-subtext">${escapeHtml(student.examResult || "--")}</span>
            </div>
          </td>
        </tr>
      `
    )
    .join("");

  if (!rows) {
    return `
      <div class="empty-state">
        <div>
          <h3>Chua co hoc vien</h3>
          <p>Sheet Students hien chua co du lieu de hien thi.</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="table-wrap">
      <table class="data-table data-table--students">
        <thead>
          <tr>
            <th>Ma HV</th>
            <th>Hoc vien</th>
            <th>Hang hoc / Buoi</th>
            <th>Trang thai</th>
            <th>Xe DAT / Km</th>
            <th>Hoc phi</th>
            <th>Thanh toan</th>
            <th>Dang ky / Ket qua</th>
          </tr>
        </thead>
        <tbody>
          ${rows}
        </tbody>
      </table>
    </div>
  `;
}

export function renderEmptyState(title, description) {
  return `
    <section class="section-card">
      <div class="empty-state">
        <div>
          <h3>${escapeHtml(title)}</h3>
          <p>${escapeHtml(description)}</p>
        </div>
      </div>
    </section>
  `;
}

export function renderErrorState(message) {
  return renderEmptyState("Khong tai duoc du lieu", message);
}
