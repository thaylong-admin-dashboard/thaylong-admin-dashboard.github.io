import { api } from "../modules/api.js";
import { requireAuth, logout } from "../modules/auth.js";
import { appUrl } from "../modules/env.js";
import { formatCurrency, formatDateTime, formatNumber, MONTH_LABELS } from "../modules/format.js";
import {
  mountDashboardLayout,
  renderErrorState,
  renderStatsGrid,
  renderStudentTable,
  updateAdminPanel
} from "../modules/layout.js";
import { getStoredSession } from "../modules/storage.js";

const layout = mountDashboardLayout({
  activeNav: "overview",
  pageTitle: "Dashboard",
  pageSubtitle: "Tong hop hoc vien, hoc phi va xu huong dang ky theo nam.",
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
let cachedStats = null;

function destroyActiveChart() {
  if (activeChart) {
    activeChart.destroy();
    activeChart = null;
  }
}

function renderFinanceGrid(summary = {}) {
  const items = [
    {
      label: "Hoc vien moi thang nay",
      value: formatNumber(summary.newThisMonth || 0),
      description: "Ho so dang ky moi trong thang hien tai"
    },
    {
      label: "Tong hoc phi",
      value: formatCurrency(summary.totalTuitionAmount || 0),
      description: "Tong gia tri hoc phi toan bo hoc vien"
    },
    {
      label: "Da thu",
      value: formatCurrency(summary.totalCollectedAmount || 0),
      description: "Tong hoc phi da thu tu hoc vien"
    },
    {
      label: "Con thieu",
      value: formatCurrency(summary.totalOutstandingAmount || 0),
      description: "Tong cong no hoc phi can theo doi"
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

function renderChartSection(reportData) {
  const totalRegistrations = reportData.monthlyRegistrations.reduce((sum, item) => sum + item, 0);

  return `
    <article class="section-card section-card--chart">
      <div class="section-heading">
        <div>
          <span class="section-eyebrow">Dang ky moi</span>
          <h2>Hoc vien theo thang</h2>
          <p class="section-text">
            Theo doi xu huong dang ky moi theo tung thang trong nam duoc chon.
          </p>
        </div>

        <label class="select-field">
          <span>Chon nam</span>
          <select data-report-year>
            ${reportData.years
              .map(
                (year) =>
                  `<option value="${year}" ${year === reportData.selectedYear ? "selected" : ""}>${year}</option>`
              )
              .join("")}
          </select>
        </label>
      </div>

      <div class="chart-meta">
        <span>Nam ${reportData.selectedYear}</span>
        <span>${totalRegistrations} hoc vien dang ky moi</span>
      </div>

      <div class="chart-canvas-wrap">
        <canvas id="registration-chart"></canvas>
      </div>
    </article>
  `;
}

function renderDashboard(reportData, statsData) {
  return `
    ${renderStatsGrid(reportData.summary)}
    ${renderFinanceGrid(reportData.summary)}

    <section class="dashboard-grid dashboard-grid--data">
      ${renderChartSection(reportData)}

      <article class="section-card">
        <div class="section-heading">
          <div>
            <span class="section-eyebrow">Tong quan nhanh</span>
            <h2>Cap nhat van hanh</h2>
            <p class="section-text">
              Cap nhat luc ${formatDateTime(statsData.generatedAt)}. Tong km DAT dang ghi nhan:
              ${formatNumber(reportData.summary.totalDatKm || 0)} km.
            </p>
          </div>
        </div>

        <div class="insight-list">
          <article class="insight-item">
            <span class="insight-item__label">Hoan thanh</span>
            <strong>${reportData.summary.completedStudents || 0} hoc vien</strong>
            <p>Da hoan tat chuong trinh hoac co ngay hoan thanh.</p>
          </article>

          <article class="insight-item">
            <span class="insight-item__label">Cong no</span>
            <strong>${formatCurrency(reportData.summary.totalOutstandingAmount || 0)}</strong>
            <p>Tong gia tri hoc phi con thieu can theo doi.</p>
          </article>

          <article class="insight-item">
            <span class="insight-item__label">Da thu</span>
            <strong>${formatCurrency(reportData.summary.totalCollectedAmount || 0)}</strong>
            <p>Tien hoc phi da thu tren tong du lieu hien tai.</p>
          </article>
        </div>
      </article>
    </section>

    <section class="section-card section-card--table">
      <div class="section-heading">
        <div>
          <span class="section-eyebrow">Moi nhat</span>
          <h2>Hoc vien dang ky gan day</h2>
          <p class="section-text">Danh sach duoc sap xep theo ngay dang ky moi nhat.</p>
        </div>
      </div>

      ${renderStudentTable(statsData.recentStudents)}
    </section>
  `;
}

function mountChart(monthlyRegistrations) {
  if (!window.Chart) {
    throw new Error("Khong tai duoc thu vien bieu do Chart.js");
  }

  const canvas = layout.content.querySelector("#registration-chart");

  if (!canvas) {
    throw new Error("Khong tim thay vung hien thi bieu do");
  }

  const context = canvas.getContext("2d");

  destroyActiveChart();

  activeChart = new window.Chart(context, {
    type: "bar",
    data: {
      labels: MONTH_LABELS,
      datasets: [
        {
          label: "Hoc vien moi",
          data: monthlyRegistrations,
          backgroundColor: "rgba(37, 99, 235, 0.86)",
          borderRadius: 14,
          borderSkipped: false,
          hoverBackgroundColor: "rgba(29, 78, 216, 1)"
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: "#0f1d3d",
          padding: 12,
          displayColors: false
        }
      },
      scales: {
        x: {
          grid: {
            display: false
          }
        },
        y: {
          beginAtZero: true,
          ticks: {
            precision: 0
          },
          grid: {
            color: "rgba(219, 228, 240, 0.9)"
          }
        }
      }
    }
  });
}

async function renderYear(year) {
  const reportData = await api.getReport(activeToken, year);
  layout.content.innerHTML = renderDashboard(reportData, cachedStats);
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

    const currentYear = new Date().getFullYear();
    const [statsData] = await Promise.all([api.getStats(session.token)]);
    cachedStats = statsData;
    await renderYear(currentYear);
  } catch (error) {
    destroyActiveChart();
    layout.content.innerHTML = renderErrorState(error.message);
  }
}

init();
