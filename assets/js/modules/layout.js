import { appUrl } from "./env.js";
import { formatDate, formatNumber, getInitials } from "./format.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getLearningTone(value) {
  const normalized = String(value || "").toLowerCase();

  if (normalized.includes("đang học")) {
    return "info";
  }

  if (normalized.includes("chờ thi")) {
    return "warning";
  }

  if (normalized.includes("hoàn thành")) {
    return "success";
  }

  return "danger";
}

function getFeeTone(value) {
  return String(value || "").toLowerCase().includes("nợ") ? "danger" : "success";
}

function renderStatusBadge(label, tone) {
  return `<span class="status-badge status-badge--${tone}">${escapeHtml(label)}</span>`;
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
      icon: "OV",
      label: "Tổng quan",
      href: appUrl("/dashboard/")
    },
    {
      id: "students",
      icon: "HV",
      label: "Học viên",
      href: appUrl("/dashboard/students/")
    },
    {
      id: "report",
      icon: "RP",
      label: "Report",
      href: appUrl("/dashboard/report/")
    }
  ];
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
            <strong>ThayLong Admin</strong>
            <small>Driving Center Panel</small>
          </span>
        </a>

        <div>
          <p class="sidebar__caption">Điều hướng chính</p>
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
                admin.role || "Quản trị viên"
              )}</p>
            </div>
          </div>

          <button class="button button-secondary button-block button-small" type="button" data-logout>
            Đăng xuất
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
                <h3>Đang tải dữ liệu</h3>
                <p>Dashboard đang xác thực token và lấy dữ liệu từ Google Apps Script.</p>
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
  layoutRefs.adminRole.textContent = admin.role || "Quản trị viên";
  layoutRefs.adminAvatar.textContent = getInitials(admin.fullName);
}

export function renderStatsGrid(summary = {}) {
  const items = [
    {
      label: "Học viên đang học",
      value: summary.activeLearning,
      hint: "Số học viên đang theo lịch học hiện tại"
    },
    {
      label: "Học viên đang chờ thi",
      value: summary.waitingExam,
      hint: "Nhóm học viên sẵn sàng cho lịch thi"
    },
    {
      label: "Học viên nợ học phí",
      value: summary.feeDebt,
      hint: "Danh sách cần theo dõi thanh toán"
    },
    {
      label: "Học viên mới tháng này",
      value: summary.newThisMonth,
      hint: "Số đăng ký mới trong tháng hiện tại"
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
            <div class="student-name">${escapeHtml(student.fullName)}</div>
            <div class="student-phone">${escapeHtml(student.phone || "--")}</div>
          </td>
          <td>
            <div class="student-course">
              <strong>${escapeHtml(student.courseName)}</strong>
              <small>${escapeHtml(student.licenseClass)}</small>
            </div>
          </td>
          <td>${renderStatusBadge(student.learningStatus, getLearningTone(student.learningStatus))}</td>
          <td>${renderStatusBadge(student.feeStatus, getFeeTone(student.feeStatus))}</td>
          <td>${formatDate(student.registerDate)}</td>
        </tr>
      `
    )
    .join("");

  if (!rows) {
    return `
      <div class="empty-state">
        <div>
          <h3>Chưa có học viên</h3>
          <p>Sheet Students hiện chưa có dữ liệu để hiển thị.</p>
        </div>
      </div>
    `;
  }

  return `
    <div class="table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Mã học viên</th>
            <th>Họ tên</th>
            <th>Khóa học / hạng xe</th>
            <th>Trạng thái học</th>
            <th>Học phí</th>
            <th>Ngày đăng ký</th>
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
  return renderEmptyState("Không tải được dữ liệu", message);
}
