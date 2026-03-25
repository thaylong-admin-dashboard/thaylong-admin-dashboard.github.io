import { formatCurrency, formatNumber, MONTH_LABELS } from "./format.js";

function toNumber(value, fallbackValue = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallbackValue;
}

export function normalizeReportData(reportData = {}, fallbackYear = new Date().getFullYear()) {
  const rawSelectedYear = Number(reportData.selectedYear);
  const years = Array.isArray(reportData.years)
    ? reportData.years.map((year) => Number(year)).filter((year) => Number.isFinite(year))
    : [];
  const resolvedYears = years.length
    ? years
    : [Number.isFinite(rawSelectedYear) ? rawSelectedYear : fallbackYear];
  const monthlyRegistrations = Array.from({ length: 12 }, (_, index) =>
    toNumber(Array.isArray(reportData.monthlyRegistrations) ? reportData.monthlyRegistrations[index] : 0)
  );

  return {
    ...reportData,
    summary: reportData.summary || {},
    selectedYear: resolvedYears.includes(rawSelectedYear) ? rawSelectedYear : resolvedYears[0],
    years: resolvedYears,
    monthlyRegistrations,
    generatedAt: reportData.generatedAt || ""
  };
}

export function renderFinanceGrid(summary = {}) {
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

export function renderRegistrationChartSection(
  reportData,
  {
    eyebrow = "Dang ky moi",
    title = "Hoc vien theo thang",
    description = "Theo doi xu huong dang ky moi theo tung thang trong nam duoc chon.",
    canvasId = "registration-chart",
    selectAttr = "data-report-year"
  } = {}
) {
  const totalRegistrations = reportData.monthlyRegistrations.reduce((sum, item) => sum + item, 0);

  return `
    <article class="section-card section-card--chart">
      <div class="section-heading">
        <div>
          <span class="section-eyebrow">${eyebrow}</span>
          <h2>${title}</h2>
          <p class="section-text">${description}</p>
        </div>

        <label class="select-field">
          <span>Chon nam</span>
          <select ${selectAttr}>
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
        <span>${formatNumber(totalRegistrations)} hoc vien dang ky moi</span>
      </div>

      <div class="chart-canvas-wrap">
        <canvas id="${canvasId}"></canvas>
      </div>
    </article>
  `;
}

export function mountRegistrationChart(canvas, monthlyRegistrations) {
  if (!window.Chart) {
    throw new Error("Khong tai duoc thu vien bieu do Chart.js");
  }

  if (!canvas) {
    throw new Error("Khong tim thay vung hien thi bieu do");
  }

  return new window.Chart(canvas.getContext("2d"), {
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
