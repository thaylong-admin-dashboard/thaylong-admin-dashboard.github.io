import { api } from "../modules/api.js";
import { requireAuth, logout } from "../modules/auth.js";
import { appUrl } from "../modules/env.js";
import { formatCurrency, formatDateTime, formatNumber } from "../modules/format.js";
import {
  mountDashboardLayout,
  renderErrorState,
  renderStatsGrid,
  updateAdminPanel
} from "../modules/layout.js";
import {
  mountRegistrationChart,
  normalizeReportData,
  renderFinanceGrid,
  renderRegistrationChartSection
} from "../modules/report-view.js";
import { getStoredSession } from "../modules/storage.js";

const layout = mountDashboardLayout({
  activeNav: "report",
  pageTitle: "Report",
  pageSubtitle: "Theo doi xu huong dang ky moi va tong hop chi so theo nam.",
  actions: [
    {
      label: "Ve dashboard",
      href: appUrl("/dashboard/"),
      variant: "secondary"
    },
    {
      label: "Xem hoc vien",
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

function renderReportPage(reportData) {
  const summary = reportData.summary || {};
  const totalRegistrations = reportData.monthlyRegistrations.reduce((sum, value) => sum + value, 0);

  return `
    ${renderStatsGrid(summary)}
    ${renderFinanceGrid(summary)}

    <section class="dashboard-grid dashboard-grid--data">
      ${renderRegistrationChartSection(reportData)}

      <article class="section-card">
        <div class="section-heading">
          <div>
            <span class="section-eyebrow">Tong hop nam</span>
            <h2>Chi so report</h2>
            <p class="section-text">
              Cap nhat luc ${formatDateTime(reportData.generatedAt)} cho nam ${reportData.selectedYear}.
            </p>
          </div>
        </div>

        <div class="insight-list">
          <article class="insight-item">
            <span class="insight-item__label">Dang ky moi</span>
            <strong>${formatNumber(totalRegistrations)} hoc vien</strong>
            <p>Tong so hoc vien dang ky moi trong nam duoc chon.</p>
          </article>

          <article class="insight-item">
            <span class="insight-item__label">Hoan thanh</span>
            <strong>${formatNumber(summary.completedStudents || 0)} hoc vien</strong>
            <p>Hoc vien da hoan tat chuong trinh hoac co ngay hoan thanh.</p>
          </article>

          <article class="insight-item">
            <span class="insight-item__label">Cong no</span>
            <strong>${formatCurrency(summary.totalOutstandingAmount || 0)}</strong>
            <p>Tong gia tri hoc phi con thieu hien co.</p>
          </article>

          <article class="insight-item">
            <span class="insight-item__label">DAT</span>
            <strong>${formatNumber(summary.totalDatKm || 0)} km</strong>
            <p>Tong so km DAT ghi nhan tren toan bo hoc vien.</p>
          </article>
        </div>
      </article>
    </section>
  `;
}

function bindYearSelect() {
  const yearSelect = layout.content.querySelector("[data-report-year]");

  yearSelect?.addEventListener("change", async (event) => {
    layout.content.innerHTML = `
      <section class="section-card">
        <div class="empty-state">
          <div>
            <h3>Dang cap nhat report</h3>
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

async function renderYear(year) {
  const reportData = normalizeReportData(await api.getReport(activeToken, year), year);

  layout.content.innerHTML = renderReportPage(reportData);
  destroyActiveChart();
  activeChart = mountRegistrationChart(
    layout.content.querySelector("#registration-chart"),
    reportData.monthlyRegistrations
  );
  bindYearSelect();
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
