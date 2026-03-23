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
  activeNav: "students",
  pageTitle: "Danh sách học viên",
  pageSubtitle: "Theo dõi đầy đủ học viên, khóa học, trạng thái học và tình trạng học phí.",
  actions: [
    {
      label: "Về dashboard",
      href: appUrl("/dashboard/"),
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

function renderStudentsView(data, students) {
  return `
    ${renderStatsGrid(data.summary)}

    <section class="section-card section-card--table">
      <div class="section-heading">
        <div>
          <span class="section-eyebrow">Danh sách</span>
          <h2>Toàn bộ học viên</h2>
          <p class="section-text">
            Tìm theo mã học viên, tên, khóa học hoặc hạng xe. Cập nhật ${formatDateTime(
              data.generatedAt
            )}.
          </p>
        </div>

        <div class="table-tools">
          <input
            class="search-input"
            type="search"
            placeholder="Tìm theo mã, tên, khóa học..."
            data-student-search
          />
        </div>
      </div>

      <div class="table-meta">
        <span data-result-count>${students.length} học viên</span>
        <span>Dữ liệu lấy trực tiếp từ Google Sheets</span>
      </div>

      <div data-table-region>${renderStudentTable(students)}</div>
    </section>
  `;
}

function filterStudents(students, keyword) {
  if (!keyword) {
    return students;
  }

  const normalizedKeyword = keyword.toLowerCase();

  return students.filter((student) =>
    [
      student.studentId,
      student.fullName,
      student.courseName,
      student.licenseClass
    ]
      .join(" ")
      .toLowerCase()
      .includes(normalizedKeyword)
  );
}

function bindSearch(students) {
  const searchInput = layout.content.querySelector("[data-student-search]");
  const tableRegion = layout.content.querySelector("[data-table-region]");
  const resultCount = layout.content.querySelector("[data-result-count]");

  searchInput?.addEventListener("input", (event) => {
    const filteredStudents = filterStudents(students, event.target.value.trim());
    resultCount.textContent = `${filteredStudents.length} học viên`;
    tableRegion.innerHTML = renderStudentTable(filteredStudents);
  });
}

async function init() {
  try {
    const session = await requireAuth();

    if (!session?.token) {
      return;
    }

    updateAdminPanel(layout, session);

    const data = await api.getStudents(session.token);
    layout.content.innerHTML = renderStudentsView(data, data.students);
    bindSearch(data.students);
  } catch (error) {
    layout.content.innerHTML = renderErrorState(error.message);
  }
}

init();
