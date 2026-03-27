import { appUrl } from "./env.js";
import { formatCurrency, formatDate, formatNumber, getInitials } from "./format.js";
import {
  hasMoneyBreakdown,
  hasOutstandingBalance,
  normalizeStudentRecord,
  normalizeTextValue
} from "./student-data.js";

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function getStatusTone(value) {
  const normalized = normalizeTextValue(value);

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

function getDebtTone(hasDebt) {
  return hasDebt ? "danger" : "success";
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
    },
    {
      id: "planner",
      icon: "LT",
      label: "Lịch tuần",
      href: appUrl("/dashboard/planner/")
    }
  ];
}

function renderMoneyStack(student) {
  const hasDebt = hasOutstandingBalance(student);

  if (!hasMoneyBreakdown(student)) {
    return `
      <div class="money-stack">
        <strong>${escapeHtml(student.feeStatus || "--")}</strong>
        <span>Chua co chi tiet hoc phi</span>
        <span class="${hasDebt ? "text-danger" : "text-success"}">
          ${hasDebt ? "Can theo doi thanh toan" : "Chua ghi nhan cong no"}
        </span>
      </div>
    `;
  }

  return `
    <div class="money-stack">
      <strong>${formatCurrency(student.tuitionTotal ?? 0)}</strong>
      <span>Da dong ${formatCurrency(student.tuitionPaid ?? 0)}</span>
      <span class="${hasDebt ? "text-danger" : "text-success"}">
        Con thieu ${formatCurrency(student.tuitionDue ?? 0)}
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
            <small>Quản lý trung tâm dạy lái</small>
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
            Đăng xuất
          </button>
        </section>
      </aside>

      <div class="dashboard-main">
        <header class="topbar">
          <div class="topbar__left">
            <button
              class="topbar__mobile-toggle"
              type="button"
              data-sidebar-toggle
              title="An hoac hien sidebar"
              aria-label="An hoac hien sidebar"
            >
              &#9776;
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
    if (window.matchMedia("(max-width: 940px)").matches) {
      document.body.classList.toggle("sidebar-open");
      return;
    }

    document.body.classList.toggle("sidebar-collapsed");
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
      label: "Tổng học viên",
      value: summary.totalStudents,
      hint: "Tong so ho so dang duoc quan ly"
    },
    {
      label: "Đang học",
      value: summary.activeLearning,
      hint: "Học viên đang theo tiếm độ đào tạo"
    },
    {
      label: "Chờ thi",
      value: summary.waitingExam,
      hint: "Học viên đã sẵn sàng chờ thi sát hạch"
    },
    {
      label: "Còn nợ học phí",
      value: summary.feeDebt,
      hint: "Số học viên còn nợ học phí"
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

export function renderStudentTable(students = [], options = {}) {
  const columns = {
    showStudentId: options.showStudentId !== false,
    showTuition: options.showTuition !== false,
    showPayment: options.showPayment !== false,
    showRegister: options.showRegister !== false
  };
  const tableClassName = `data-table data-table--students${
    Object.values(columns).some((isVisible) => !isVisible) ? " data-table--compact" : ""
  }`;
  const rows = students
    .map((rawStudent) => {
      const student = normalizeStudentRecord(rawStudent);
      const hasDebt = hasOutstandingBalance(student);
      const detailLine = student.birthDate
        ? `Ngay sinh ${formatDate(student.birthDate)}`
        : student.notes
          ? `Ghi chu ${student.notes}`
          : "--";
      const programPrimary = student.licenseClass || student.courseName || "--";
      const programSecondary =
        student.sessionType ||
        (student.courseName && student.courseName !== programPrimary ? student.courseName : "--");
      const datMeta = student.datKm === null ? "--" : `${formatNumber(student.datKm)} km DAT`;
      const paymentLabel = student.feeStatus || (hasDebt ? "Con thieu" : "Da du");
      const registerMeta = student.examResult || student.notes || "--";
      const cells = [];

      if (columns.showStudentId) {
        cells.push(`<td>${escapeHtml(student.studentId)}</td>`);
      }

      cells.push(`
        <td>
          <div class="student-meta">
            <strong class="student-name">${escapeHtml(student.fullName || "--")}</strong>
            <span class="student-subtext">${escapeHtml(student.phone || "--")}</span>
            <span class="student-subtext">${escapeHtml(detailLine)}</span>
          </div>
        </td>
      `);

      cells.push(`
        <td>
          <div class="student-meta">
            <strong>${escapeHtml(programPrimary)}</strong>
            <span class="student-subtext">${escapeHtml(programSecondary)}</span>
          </div>
        </td>
      `);

      cells.push(`<td>${renderStatusBadge(student.status, getStatusTone(student.status))}</td>`);

      cells.push(`
        <td>
          <div class="student-meta">
            <strong>${escapeHtml(student.datVehicle || "--")}</strong>
            <span class="student-subtext">${escapeHtml(datMeta)}</span>
          </div>
        </td>
      `);

      if (columns.showTuition) {
        cells.push(`<td>${renderMoneyStack(student)}</td>`);
      }

      if (columns.showPayment) {
        cells.push(`<td>${renderStatusBadge(paymentLabel, getDebtTone(hasDebt))}</td>`);
      }

      if (columns.showRegister) {
        cells.push(`
          <td>
            <div class="student-meta">
              <strong>${formatDate(student.registerDate)}</strong>
              <span class="student-subtext">${escapeHtml(registerMeta)}</span>
            </div>
          </td>
        `);
      }

      return `
        <tr>
          ${cells.join("")}
        </tr>
      `;
    })
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
      <table class="${tableClassName}">
        <thead>
          <tr>
            ${columns.showStudentId ? "<th>Ma HV</th>" : ""}
            <th>Hoc vien</th>
            <th>Hang hoc / Chi tiet</th>
            <th>Trang thai</th>
            <th>Xe DAT / Km</th>
            ${columns.showTuition ? "<th>Hoc phi</th>" : ""}
            ${columns.showPayment ? "<th>Thanh toan</th>" : ""}
            ${columns.showRegister ? "<th>Dang ky / Ket qua</th>" : ""}
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
