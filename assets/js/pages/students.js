import { api } from "../modules/api.js";
import { requireAuth, logout } from "../modules/auth.js";
import { formatDateTime } from "../modules/format.js";
import {
  mountDashboardLayout,
  renderErrorState,
  renderStatsGrid,
  renderStudentTable,
  updateAdminPanel
} from "../modules/layout.js";
import { getStoredSession } from "../modules/storage.js";
import {
  hasOutstandingBalance,
  normalizeStudentCollection,
  normalizeTextValue
} from "../modules/student-data.js";

const layout = mountDashboardLayout({
  activeNav: "students",
  pageTitle: "Danh sach hoc vien",
  pageSubtitle: "Tra cuu thong tin hoc vien, hoc phi, DAT va ket qua dao tao.",
  actions: [],
  admin: getStoredSession() || {},
  onLogout: logout
});

function normalizeText(value) {
  return normalizeTextValue(value);
}

function getUniqueOptions(students, field) {
  return [...new Set(students.map((student) => student[field]).filter(Boolean))].sort((left, right) =>
    String(left).localeCompare(String(right), "vi")
  );
}

function renderStudentsView(data, students) {
  const statusOptions = getUniqueOptions(students, "status");
  const licenseOptions = getUniqueOptions(students, "licenseClass");

  return `
    ${renderStatsGrid(data.summary)}

    <section class="section-card section-card--table">
      <div class="section-heading">
        <div>
          <span class="section-eyebrow">Danh sach hoc vien</span>
          <h2>Ho so chi tiet</h2>
          <p class="section-text">
            Cap nhat ${formatDateTime(data.generatedAt)}. Loc theo ten, so dien thoai, trang thai,
            hang hoc va tien do hoc phi.
          </p>
        </div>
      </div>

      <div class="filter-grid">
        <input
          class="search-input search-input--wide"
          type="search"
          placeholder="Tim theo ma hoc vien, ho ten, so dien thoai, ghi chu..."
          data-student-search
        />

        <select data-status-filter>
          <option value="">Tat ca trang thai</option>
          ${statusOptions.map((status) => `<option value="${status}">${status}</option>`).join("")}
        </select>

        <select data-license-filter>
          <option value="">Tat ca hang hoc</option>
          ${licenseOptions
            .map((licenseClass) => `<option value="${licenseClass}">${licenseClass}</option>`)
            .join("")}
        </select>

        <select data-debt-filter>
          <option value="">Tat ca hoc phi</option>
          <option value="debt">Con thieu</option>
          <option value="paid">Da du</option>
        </select>
      </div>

      <div class="table-meta">
        <span data-result-count>${students.length} hoc vien</span>
        <span>Du lieu lay tu sheet Students</span>
      </div>

      <div data-table-region>${renderStudentTable(students)}</div>
    </section>
  `;
}

function filterStudents(students, filters) {
  const keyword = normalizeText(filters.keyword);
  const status = normalizeText(filters.status);
  const licenseClass = normalizeText(filters.licenseClass);
  const debt = filters.debt;

  return students.filter((student) => {
    const keywordMatches =
      !keyword ||
      [
        student.studentId,
        student.fullName,
        student.courseName,
        student.phone,
        student.notes,
        student.datVehicle,
        student.feeStatus
      ]
        .map(normalizeText)
        .join(" ")
        .includes(keyword);

    const statusMatches = !status || normalizeText(student.status) === status;
    const licenseMatches = !licenseClass || normalizeText(student.licenseClass) === licenseClass;
    const debtMatches =
      !debt || (debt === "debt" ? hasOutstandingBalance(student) : !hasOutstandingBalance(student));

    return keywordMatches && statusMatches && licenseMatches && debtMatches;
  });
}

function bindFilters(students) {
  const searchInput = layout.content.querySelector("[data-student-search]");
  const statusFilter = layout.content.querySelector("[data-status-filter]");
  const licenseFilter = layout.content.querySelector("[data-license-filter]");
  const debtFilter = layout.content.querySelector("[data-debt-filter]");
  const tableRegion = layout.content.querySelector("[data-table-region]");
  const resultCount = layout.content.querySelector("[data-result-count]");

  function applyFilters() {
    const filteredStudents = filterStudents(students, {
      keyword: searchInput?.value || "",
      status: statusFilter?.value || "",
      licenseClass: licenseFilter?.value || "",
      debt: debtFilter?.value || ""
    });

    resultCount.textContent = `${filteredStudents.length} hoc vien`;
    tableRegion.innerHTML = renderStudentTable(filteredStudents);
  }

  searchInput?.addEventListener("input", applyFilters);
  statusFilter?.addEventListener("change", applyFilters);
  licenseFilter?.addEventListener("change", applyFilters);
  debtFilter?.addEventListener("change", applyFilters);
}

async function init() {
  try {
    const session = await requireAuth();

    if (!session?.token) {
      return;
    }

    updateAdminPanel(layout, session);

    const data = await api.getStudents(session.token);
    const students = normalizeStudentCollection(data.students);

    layout.content.innerHTML = renderStudentsView(data, students);
    bindFilters(students);
  } catch (error) {
    layout.content.innerHTML = renderErrorState(error.message);
  }
}

init();
