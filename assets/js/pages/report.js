import { api } from "../modules/api.js";
import { requireAuth, logout } from "../modules/auth.js";
import { appUrl } from "../modules/env.js";
import { MONTH_LABELS } from "../modules/format.js";
import {
  mountDashboardLayout,
  renderErrorState,
  renderStatsGrid,
  updateAdminPanel
} from "../modules/layout.js";
import { getStoredSession } from "../modules/storage.js";

const layout = mountDashboardLayout({
  activeNav: "report",
  pageTitle: "Report",
  pageSubtitle: "Xem xu hướng học viên đăng ký mới theo từng tháng trong năm.",
  actions: [
    {
      label: "Về dashboard",
      href: appUrl("/dashboard/"),
      variant: "secondary"
    },
    {
      label: "Xem danh sách học viên",
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

function renderReportView(data) {
  const totalRegistrations = data.monthlyRegistrations.reduce((sum, item) => sum + item, 0);

  return `
    ${renderStatsGrid(data.summary)}

    <section class="section-card">
      <div class="section-heading">
        <div>
          <span class="section-eyebrow">Phân tích</span>
          <h2>Học viên đăng ký mới theo tháng</h2>
          <p class="section-text">
            Biểu đồ được dựng từ sheet Students và thay đổi tương ứng khi đổi năm.
          </p>
        </div>

        <label class="select-field">
          <span>Chọn năm</span>
          <select data-report-year>
            ${data.years
              .map(
                (year) =>
                  `<option value="${year}" ${year === data.selectedYear ? "selected" : ""}>${year}</option>`
              )
              .join("")}
          </select>
        </label>
      </div>

      <div class="chart-meta">
        <span>Năm ${data.selectedYear}</span>
        <span>${totalRegistrations} học viên đăng ký mới</span>
      </div>

      <div class="chart-canvas-wrap">
        <canvas id="registration-chart"></canvas>
      </div>
    </section>
  `;
}

function mountChart(monthlyRegistrations) {
  if (!window.Chart) {
    throw new Error("Không tải được thư viện biểu đồ Chart.js");
  }

  const canvas = layout.content.querySelector("#registration-chart");

  if (!canvas) {
    throw new Error("Không tìm thấy vùng hiển thị biểu đồ");
  }

  const context = canvas.getContext("2d");

  destroyActiveChart();

  activeChart = new window.Chart(context, {
    type: "bar",
    data: {
      labels: MONTH_LABELS,
      datasets: [
        {
          label: "Học viên mới",
          data: monthlyRegistrations,
          backgroundColor: "rgba(37, 99, 235, 0.86)",
          borderRadius: 12,
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
  layout.content.innerHTML = renderReportView(reportData);
  mountChart(reportData.monthlyRegistrations);

  const yearSelect = layout.content.querySelector("[data-report-year]");
  yearSelect?.addEventListener("change", async (event) => {
    layout.content.innerHTML = `
      <section class="section-card">
        <div class="empty-state">
          <div>
            <h3>Đang cập nhật report</h3>
            <p>Hệ thống đang lấy dữ liệu biểu đồ cho năm ${event.target.value}.</p>
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
