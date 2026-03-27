import { api } from "../modules/api.js";
import { requireAuth, logout } from "../modules/auth.js";
import { formatDate, formatDateTime } from "../modules/format.js";
import { mountDashboardLayout, updateAdminPanel } from "../modules/layout.js";
import { getStoredSession } from "../modules/storage.js";

const DAY_FORMATTER = new Intl.DateTimeFormat("vi-VN", { weekday: "long" });
const TRAINING_TYPE_LABELS = {
  DAT: "DAT",
  YARD_PRACTICE: "Sân tập",
  SELF_DRIVING: "Tự lái"
};
const CAR_TYPE_LABELS = {
  MANUAL: "Số sàn",
  AUTOMATIC: "Số tự động"
};
const SESSION_LABELS = {
  morning: "Sáng",
  afternoon: "Chiều"
};
const state = {
  token: "",
  weekStart: getStartOfWeekIso(new Date()),
  status: "loading",
  errorMessage: "",
  data: null,
  requestId: 0,
  filters: {
    trainingType: "",
    carType: ""
  }
};

const layout = mountDashboardLayout({
  activeNav: "planner",
  pageTitle: "Lịch tuần",
  pageSubtitle: "Theo dõi lịch đào tạo theo từng ngày, buổi sáng và buổi chiều.",
  actions: [],
  admin: getStoredSession() || {},
  onLogout: logout
});

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function parseLocalDate(value) {
  if (!value) {
    return null;
  }

  const isoMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (isoMatch) {
    return new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate;
}

function toIsoDate(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

function addDays(date, amount) {
  const nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  nextDate.setDate(nextDate.getDate() + amount);
  return nextDate;
}

function getStartOfWeek(date) {
  const currentDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = currentDate.getDay();
  const diff = day === 0 ? -6 : 1 - day;

  currentDate.setDate(currentDate.getDate() + diff);
  return currentDate;
}

function getStartOfWeekIso(date) {
  return toIsoDate(getStartOfWeek(date));
}

function shiftWeek(weekStart, amount) {
  return toIsoDate(addDays(parseLocalDate(weekStart), amount * 7));
}

function capitalizeFirst(value) {
  if (!value) {
    return "";
  }

  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatDayName(dateValue) {
  const date = parseLocalDate(dateValue);
  return date ? capitalizeFirst(DAY_FORMATTER.format(date)) : "--";
}

function isToday(dateValue) {
  return dateValue === toIsoDate(new Date());
}

function resolveWeekEnd(weekStart) {
  return toIsoDate(addDays(parseLocalDate(weekStart), 6));
}

function getWeekInfo() {
  const activeData = state.status === "ready" ? state.data : null;
  const weekStart = activeData?.weekStart || state.weekStart;
  const weekEnd = activeData?.weekEnd || resolveWeekEnd(weekStart);

  return {
    weekStart,
    weekEnd,
    label: `Tuần ${formatDate(weekStart)} - ${formatDate(weekEnd)}`
  };
}

function normalizePlannerEntry(entry = {}, fallbackDate, fallbackSession) {
  return {
    id: String(entry.id || "").trim(),
    date: String(entry.date || fallbackDate || "").trim(),
    session: String(entry.session || fallbackSession || "").trim(),
    studentName: String(entry.studentName || entry.fullName || "").trim(),
    trainingType: String(entry.trainingType || "").trim().toUpperCase(),
    carType: String(entry.carType || "").trim().toUpperCase(),
    licensePlate: String(entry.licensePlate || "").trim(),
    teacherName: String(entry.teacherName || "").trim(),
    location: String(entry.location || "").trim(),
    note: String(entry.note || "").trim(),
    confirmationStatus: String(entry.confirmationStatus || "").trim()
  };
}

function normalizePlannerData(rawData = {}, fallbackWeekStart) {
  const baseWeekStart = parseLocalDate(rawData.weekStart || fallbackWeekStart || state.weekStart);
  const resolvedWeekStart = baseWeekStart ? toIsoDate(getStartOfWeek(baseWeekStart)) : state.weekStart;
  const resolvedWeekEnd = rawData.weekEnd || resolveWeekEnd(resolvedWeekStart);
  const rawDays = Array.isArray(rawData.days) ? rawData.days : [];
  const dayMap = new Map(
    rawDays.map((day) => [
      String(day.date || "").trim(),
      {
        morning: Array.isArray(day?.sessions?.morning) ? day.sessions.morning : [],
        afternoon: Array.isArray(day?.sessions?.afternoon) ? day.sessions.afternoon : []
      }
    ])
  );

  const days = Array.from({ length: 7 }, (_, index) => {
    const date = toIsoDate(addDays(parseLocalDate(resolvedWeekStart), index));
    const sessions = dayMap.get(date) || { morning: [], afternoon: [] };

    return {
      date,
      sessions: {
        morning: sessions.morning.map((entry) => normalizePlannerEntry(entry, date, "morning")),
        afternoon: sessions.afternoon.map((entry) =>
          normalizePlannerEntry(entry, date, "afternoon")
        )
      }
    };
  });

  return {
    weekStart: resolvedWeekStart,
    weekEnd: resolvedWeekEnd,
    generatedAt: rawData.generatedAt || "",
    days
  };
}

function getAvailableOptions(days, field, preferredOptions) {
  const dynamicOptions = days
    .flatMap((day) => [...day.sessions.morning, ...day.sessions.afternoon])
    .map((entry) => entry[field])
    .filter(Boolean);

  return [...new Set([...preferredOptions, ...dynamicOptions])];
}

function applyFilters(days) {
  const selectedTrainingType = state.filters.trainingType;
  const selectedCarType = state.filters.carType;

  return days.map((day) => ({
    ...day,
    sessions: {
      morning: day.sessions.morning.filter((entry) => {
        const trainingMatches = !selectedTrainingType || entry.trainingType === selectedTrainingType;
        const carMatches = !selectedCarType || entry.carType === selectedCarType;
        return trainingMatches && carMatches;
      }),
      afternoon: day.sessions.afternoon.filter((entry) => {
        const trainingMatches = !selectedTrainingType || entry.trainingType === selectedTrainingType;
        const carMatches = !selectedCarType || entry.carType === selectedCarType;
        return trainingMatches && carMatches;
      })
    }
  }));
}

function syncFilters(days) {
  const availableTrainingTypes = getAvailableOptions(days, "trainingType", Object.keys(TRAINING_TYPE_LABELS));
  const availableCarTypes = getAvailableOptions(days, "carType", Object.keys(CAR_TYPE_LABELS));

  if (state.filters.trainingType && !availableTrainingTypes.includes(state.filters.trainingType)) {
    state.filters.trainingType = "";
  }

  if (state.filters.carType && !availableCarTypes.includes(state.filters.carType)) {
    state.filters.carType = "";
  }

  return {
    availableTrainingTypes,
    availableCarTypes
  };
}

function getMeta(days) {
  const totalEntries = days.reduce(
    (sum, day) => sum + day.sessions.morning.length + day.sessions.afternoon.length,
    0
  );
  const filledSessions = days.reduce((sum, day) => {
    return sum + Number(day.sessions.morning.length > 0) + Number(day.sessions.afternoon.length > 0);
  }, 0);

  return {
    totalEntries,
    emptySessions: 14 - filledSessions
  };
}

function getTrainingTypeLabel(trainingType) {
  return TRAINING_TYPE_LABELS[trainingType] || trainingType || "--";
}

function getCarTypeLabel(carType) {
  return CAR_TYPE_LABELS[carType] || carType || "--";
}

function renderOptionList(options, selectedValue, labelMap) {
  return options
    .map((value) => {
      const label = labelMap[value] || value;
      return `<option value="${escapeHtml(value)}" ${value === selectedValue ? "selected" : ""}>${escapeHtml(label)}</option>`;
    })
    .join("");
}

function renderEntry(entry) {
  const metaRows = [
    entry.licensePlate ? `Biển số: ${entry.licensePlate}` : "",
    entry.teacherName ? `Phụ trách: ${entry.teacherName}` : "",
    entry.location ? `Địa điểm: ${entry.location}` : ""
  ].filter(Boolean);

  return `
    <article class="planner-entry">
      <strong class="planner-entry__name">${escapeHtml(entry.studentName || "Chưa gán học viên")}</strong>

      <div class="planner-entry__tags">
        <span class="planner-pill planner-pill--training">${escapeHtml(
          getTrainingTypeLabel(entry.trainingType)
        )}</span>
        <span class="planner-pill planner-pill--vehicle">${escapeHtml(
          getCarTypeLabel(entry.carType)
        )}</span>
        ${
          entry.confirmationStatus
            ? `<span class="planner-pill planner-pill--status">${escapeHtml(entry.confirmationStatus)}</span>`
            : ""
        }
      </div>

      ${
        metaRows.length
          ? `<div class="planner-entry__meta">${metaRows
              .map((item) => `<span>${escapeHtml(item)}</span>`)
              .join("")}</div>`
          : ""
      }

      ${
        entry.note
          ? `<p class="planner-entry__note">${escapeHtml(entry.note)}</p>`
          : ""
      }
    </article>
  `;
}

function renderSkeletonEntry() {
  return `
    <article class="planner-entry">
      <div class="planner-skeleton-line planner-skeleton-line--lg"></div>
      <div class="planner-entry__tags">
        <span class="planner-skeleton-line planner-skeleton-line--sm"></span>
        <span class="planner-skeleton-line planner-skeleton-line--sm"></span>
      </div>
      <div class="planner-entry__meta">
        <span class="planner-skeleton-line planner-skeleton-line--md"></span>
        <span class="planner-skeleton-line planner-skeleton-line--lg"></span>
      </div>
    </article>
  `;
}

function renderSession(sessionKey, entries, isLoading) {
  const content = isLoading
    ? `${renderSkeletonEntry()}${renderSkeletonEntry()}`
    : entries.length
      ? entries.map((entry) => renderEntry(entry)).join("")
      : `<div class="planner-empty">Chưa có lịch</div>`;

  return `
    <section class="planner-session">
      <div class="planner-session__head">
        <h3 class="planner-session__title">${SESSION_LABELS[sessionKey]}</h3>
        <span class="planner-session__count">${
          isLoading ? "Đang tải..." : `${entries.length} lịch`
        }</span>
      </div>

      <div class="planner-session__items">${content}</div>
    </section>
  `;
}

function renderDayCard(day, isLoading) {
  return `
    <article class="planner-day ${isToday(day.date) ? "planner-day--today" : ""}">
      <header class="planner-day__header">
        <div class="planner-day__header-top">
          <span class="planner-day__name">${escapeHtml(formatDayName(day.date))}</span>
          ${isToday(day.date) ? '<span class="planner-day__today-pill">Hôm nay</span>' : ""}
        </div>
        <span class="planner-day__date">${escapeHtml(formatDate(day.date))}</span>
      </header>

      <div class="planner-day__sessions">
        ${renderSession("morning", day.sessions.morning, isLoading)}
        ${renderSession("afternoon", day.sessions.afternoon, isLoading)}
      </div>
    </article>
  `;
}

function buildLoadingDays() {
  const weekStart = parseLocalDate(state.weekStart);

  return Array.from({ length: 7 }, (_, index) => {
    const date = toIsoDate(addDays(weekStart, index));

    return {
      date,
      sessions: {
        morning: [],
        afternoon: []
      }
    };
  });
}

function renderControls(days, isLoading) {
  const weekInfo = getWeekInfo();
  const options = syncFilters(state.status === "ready" && state.data ? state.data.days : []);
  const meta = getMeta(days);

  return `
    <section class="section-card planner-controls">
      <div class="planner-controls__header">
        <div>
          <span class="section-eyebrow">Lịch đào tạo</span>
          <h2>${escapeHtml(weekInfo.label)}</h2>
          <p class="section-text">
            Tải dữ liệu theo từng tuần từ sheet WeeklyPlanner qua Google Apps Script.
          </p>
        </div>

        <div class="planner-week-actions">
          <button class="button button-secondary button-small" type="button" data-week-nav="prev">
            Tuần trước
          </button>
          <button class="button button-secondary button-small" type="button" data-week-nav="current">
            Tuần hiện tại
          </button>
          <button class="button button-primary button-small" type="button" data-week-nav="next">
            Tuần sau
          </button>
        </div>
      </div>

      <div class="planner-toolbar">
        <div class="planner-meta">
          <span class="planner-meta__item">${meta.totalEntries} lịch trong tuần</span>
          <span class="planner-meta__item">${meta.emptySessions} ca còn trống</span>
          <span class="planner-meta__item">
            ${state.data?.generatedAt ? `Cập nhật ${formatDateTime(state.data.generatedAt)}` : "Đang tải dữ liệu"}
          </span>
        </div>

        <div class="planner-filter-row">
          <label class="select-field">
            <span>Loại học</span>
            <select data-filter="trainingType" ${isLoading ? "disabled" : ""}>
              <option value="">Tất cả</option>
              ${renderOptionList(
                options.availableTrainingTypes,
                state.filters.trainingType,
                TRAINING_TYPE_LABELS
              )}
            </select>
          </label>

          <label class="select-field">
            <span>Loại xe</span>
            <select data-filter="carType" ${isLoading ? "disabled" : ""}>
              <option value="">Tất cả</option>
              ${renderOptionList(options.availableCarTypes, state.filters.carType, CAR_TYPE_LABELS)}
            </select>
          </label>
        </div>
      </div>
    </section>
  `;
}

function renderErrorCard() {
  return `
    <section class="section-card">
      <div class="planner-feedback">
        <div>
          <h3>Không tải được lịch tuần</h3>
          <p>${escapeHtml(state.errorMessage || "Vui lòng thử lại sau ít phút.")}</p>
        </div>

        <button class="button button-primary button-small" type="button" data-retry>
          Tải lại
        </button>
      </div>
    </section>
  `;
}

function render() {
  const isLoading = state.status === "loading";
  const activeData = state.status === "ready" ? state.data : null;
  const normalizedData = activeData || normalizePlannerData({}, state.weekStart);
  const visibleDays = isLoading ? buildLoadingDays() : applyFilters(normalizedData.days);

  layout.content.innerHTML = `
    ${renderControls(visibleDays, isLoading)}
    ${
      state.status === "error"
        ? renderErrorCard()
        : `<div class="planner-grid-wrap">
            <section class="planner-grid">
              ${visibleDays.map((day) => renderDayCard(day, isLoading)).join("")}
            </section>
          </div>`
    }
  `;

  bindEvents();
}

function bindEvents() {
  layout.content.querySelectorAll("[data-week-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      const direction = button.getAttribute("data-week-nav");

      if (direction === "prev") {
        loadWeek(shiftWeek(state.weekStart, -1));
        return;
      }

      if (direction === "next") {
        loadWeek(shiftWeek(state.weekStart, 1));
        return;
      }

      loadWeek(getStartOfWeekIso(new Date()));
    });
  });

  layout.content.querySelectorAll("[data-filter]").forEach((field) => {
    field.addEventListener("change", () => {
      const filterKey = field.getAttribute("data-filter");
      state.filters[filterKey] = field.value;
      render();
    });
  });

  layout.content.querySelector("[data-retry]")?.addEventListener("click", () => {
    loadWeek(state.weekStart);
  });
}

async function loadWeek(weekStart) {
  state.weekStart = weekStart;
  state.status = "loading";
  state.errorMessage = "";
  render();

  const requestId = state.requestId + 1;
  state.requestId = requestId;

  try {
    const plannerData = await api.getPlanner(state.token, weekStart);

    if (requestId !== state.requestId) {
      return;
    }

    state.data = normalizePlannerData(plannerData, weekStart);
    state.status = "ready";
    syncFilters(state.data.days);
    render();
  } catch (error) {
    if (requestId !== state.requestId) {
      return;
    }

    state.status = "error";
    state.errorMessage = error.message;
    render();
  }
}

async function init() {
  render();

  try {
    const session = await requireAuth();

    if (!session?.token) {
      return;
    }

    state.token = session.token;
    updateAdminPanel(layout, session);
    await loadWeek(state.weekStart);
  } catch (error) {
    state.status = "error";
    state.errorMessage = error.message;
    render();
  }
}

init();
