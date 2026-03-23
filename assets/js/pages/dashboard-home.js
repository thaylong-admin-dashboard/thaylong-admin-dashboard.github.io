import { api } from "../modules/api.js";
import { requireAuth, logout } from "../modules/auth.js";
import { appUrl } from "../modules/env.js";
import { formatDateTime } from "../modules/format.js";
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
  pageTitle: "Dashboard chính",
  pageSubtitle: "Theo dõi vận hành trung tâm và tình hình học viên theo thời gian thực.",
  actions: [
    {
      label: "Xem danh sách học viên",
      href: appUrl("/dashboard/students/"),
      variant: "secondary"
    },
    {
      label: "Xem report",
      href: appUrl("/dashboard/report/"),
      variant: "primary"
    }
  ],
  admin: getStoredSession() || {},
  onLogout: logout
});

function renderOverview(data) {
  return `
    ${renderStatsGrid(data.summary)}

    <section class="dashboard-grid">
      <article class="section-card">
        <div class="section-heading">
          <div>
            <span class="section-eyebrow">Vận hành</span>
            <h2>Snapshot trung tâm</h2>
            <p class="section-text">
              Các chỉ số bên dưới được lấy trực tiếp từ Google Sheets qua Apps Script.
            </p>
          </div>
          <span class="subtle-tag">Cập nhật ${formatDateTime(data.generatedAt)}</span>
        </div>

        <div class="info-grid">
          <article class="info-tile">
            <span class="section-eyebrow">KPI 01</span>
            <h3>Luồng đăng nhập đã cố định</h3>
            <p>Tất cả admin đi qua <code>/</code> và khi hợp lệ sẽ chuyển sang <code>/dashboard/</code>.</p>
          </article>

          <article class="info-tile">
            <span class="section-eyebrow">KPI 02</span>
            <h3>Dữ liệu chỉ render khi token hợp lệ</h3>
            <p>Mỗi lần vào dashboard, token đều được xác thực lại qua API <code>session</code>.</p>
          </article>

          <article class="info-tile">
            <span class="section-eyebrow">KPI 03</span>
            <h3>Students là nguồn chung cho report</h3>
            <p>Biểu đồ năm và bảng học viên cùng dùng dữ liệu gốc từ sheet <code>Students</code>.</p>
          </article>
        </div>
      </article>

      <article class="section-card section-card--table">
        <div class="section-heading">
          <div>
            <span class="section-eyebrow">Mới nhất</span>
            <h2>Học viên đăng ký gần đây</h2>
            <p class="section-text">Giúp admin rà nhanh hoạt động tuyển sinh gần nhất.</p>
          </div>
        </div>

        ${renderStudentTable(data.recentStudents)}
      </article>
    </section>
  `;
}

async function init() {
  try {
    const session = await requireAuth();

    if (!session?.token) {
      return;
    }

    updateAdminPanel(layout, session);

    const data = await api.getStats(session.token);
    layout.content.innerHTML = renderOverview(data);
  } catch (error) {
    layout.content.innerHTML = renderErrorState(error.message);
  }
}

init();
