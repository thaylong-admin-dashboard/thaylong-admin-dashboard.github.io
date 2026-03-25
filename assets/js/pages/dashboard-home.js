import { api } from "../modules/api.js";
import { requireAuth, logout } from "../modules/auth.js";
import { appUrl } from "../modules/env.js";
import { formatNumber } from "../modules/format.js";
import {
  mountDashboardLayout,
  renderErrorState,
  updateAdminPanel
} from "../modules/layout.js";
import {
  mountRegistrationChart,
  normalizeReportData,
  renderRegistrationChartSection
} from "../modules/report-view.js";
import { getStoredSession } from "../modules/storage.js";

const layout = mountDashboardLayout({
  activeNav: "overview",
  pageTitle: "Dashboard",
  pageSubtitle: "Tong hop hoc vien, hoc phi va xu huong dang ky theo nam",
  actions: [
    {
      label: "Xem danh sach hoc vien",
      href: appUrl("/dashboard/students/"),
      variant: "primary"
    }
  ],
  admin: getStoredSession() || {},
  onLogout: logout
});

let activeToken = "";
let activeChart = null;

function destroyActiveChart() {
  if (activeChart) {
    activeChart.destroy();
    activeChart = null;
  }
}

function renderDashboardStats(summary = {}) {
  const items = [
    {
      label: "Dang hoc",
      value: formatNumber(summary.activeLearning || 0),
      hint: "Hoc vien dang theo tien do dao tao"
    },
    {
      label: "Cho thi",
      value: formatNumber(summary.waitingExam || 0),
      hint: "Hoc vien da san sang cho ky sat hach"
    },
    {
      label: "Con hoc phi",
      value: formatNumber(summary.feeDebt || 0),
      hint: "So hoc vien con cong no hoc phi"
    }
  ];

  return `
    <section class="stats-grid">
      ${items
        .map(
          (item) => `
            <article class="stat-card">
              <span class="stat-card__label">${item.label}</span>
              <p class="stat-card__value">${item.value}</p>
              <p class="stat-card__hint">${item.hint}</p>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderDashboardFinance(summary = {}) {
  const items = [
    {
      label: "Hoc vien moi thang nay",
      value: formatNumber(summary.newThisMonth || 0),
      description: "Ho so dang ky moi trong thang hien tai"
    }
  ];

  return `
    <section class="finance-grid">
      ${items
        .map(
          (item) => `
            <article class="finance-card">
              <span class="finance-card__label">${item.label}</span>
              <strong class="finance-card__value">${item.value}</strong>
              <p class="finance-card__copy">${item.description}</p>
            </article>
          `
        )
        .join("")}
    </section>
  `;
}

function renderDashboard(reportData) {
  const summary = reportData.summary || {};

  return `
    ${renderDashboardStats(summary)}
    ${renderDashboardFinance(summary)}
    ${renderRegistrationChartSection(reportData)}
  `;
}

function mountChart(monthlyRegistrations) {
  destroyActiveChart();
  activeChart = mountRegistrationChart(
    layout.content.querySelector("#registration-chart"),
    monthlyRegistrations
  );
}

async function renderYear(year) {
  const reportData = normalizeReportData(await api.getReport(activeToken, year), year);

  layout.content.innerHTML = renderDashboard(reportData);
  mountChart(reportData.monthlyRegistrations);

  const yearSelect = layout.content.querySelector("[data-report-year]");
  yearSelect?.addEventListener("change", async (event) => {
    layout.content.innerHTML = `
      <section class="section-card">
        <div class="empty-state">
          <div>
            <h3>Dang cap nhat dashboard</h3>
            <p>He thong dang tai du lieu cho nam ${event.target.value}.</p>
          </div>
        </div>
      </section>
    `;

    try {
      await renderYear(Number(event.target.value));
    } catch (error) {
      destroyActiveChart();
      layout.content.innerHTML = renderErrorState(error.message);
    }
  });
}

async function init() {
  try {
    const session = await requireAuth();

    if (!session?.token) {
      return;
    }

    activeToken = session.token;
    updateAdminPanel(layout, session);
    await renderYear(new Date().getFullYear());
  } catch (error) {
    destroyActiveChart();
    layout.content.innerHTML = renderErrorState(error.message);
  }
}

init();
