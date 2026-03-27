var ADMIN_SHEET_NAMES = ["Admins", "ThayLong Admin Data - Admins"];
var STUDENT_SHEET_NAMES = ["Students", "ThayLong Admin Data - Students"];
var PLANNER_SHEET_NAMES = ["WeeklyPlanner", "Weekly Planner", "LichTuan", "Lich Tuan"];
var SESSION_PREFIX = "session_";
var SESSION_TTL_MS = 1000 * 60 * 60 * 12;
var APP_TIMEZONE = "Asia/Bangkok";

function doGet(e) {
  try {
    var action = getAction_(e);

    if (action === "session") {
      return jsonSuccess_(handleSession_(e.parameter));
    }

    if (action === "stats") {
      return jsonSuccess_(handleStats_(e.parameter));
    }

    if (action === "students") {
      return jsonSuccess_(handleStudents_(e.parameter));
    }

    if (action === "report") {
      return jsonSuccess_(handleReport_(e.parameter));
    }

    if (action === "planner") {
      return jsonSuccess_(handlePlanner_(e.parameter));
    }

    return jsonError_("Unsupported action");
  } catch (error) {
    return jsonError_(error.message);
  }
}

function doPost(e) {
  try {
    var action = getAction_(e);

    if (action !== "login") {
      return jsonError_("Unsupported action");
    }

    return jsonSuccess_(handleLogin_(e.parameter));
  } catch (error) {
    return jsonError_(error.message);
  }
}

function handleLogin_(params) {
  var username = normalizeText_(params.username);
  var password = cleanString_(params.password);

  if (!username || !password) {
    throw new Error("Vui long nhap tai khoan va mat khau");
  }

  var admin = getAdmins_().find(function (item) {
    return (
      normalizeText_(item.username) === username &&
      cleanString_(item.password) === password &&
      normalizeBoolean_(item.is_active, true)
    );
  });

  if (!admin) {
    throw new Error("Thong tin dang nhap khong hop le");
  }

  purgeExpiredSessions_();

  var token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  var expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
  var adminPayload = {
    username: admin.username,
    fullName: admin.full_name,
    role: admin.role || "Quan ly trung tam"
  };

  saveSession_(token, {
    username: adminPayload.username,
    fullName: adminPayload.fullName,
    role: adminPayload.role,
    expiresAt: expiresAt
  });

  return {
    token: token,
    expiresAt: expiresAt,
    admin: adminPayload
  };
}

function handleSession_(params) {
  var session = requireSession_(params.token);

  return {
    authenticated: true,
    expiresAt: session.expiresAt,
    admin: {
      username: session.username,
      fullName: session.fullName,
      role: session.role
    }
  };
}

function handleStats_(params) {
  requireSession_(params.token);

  var students = sortStudentsByRegisterDate_(getStudents_());

  return {
    summary: buildSummary_(students),
    recentStudents: students.slice(0, 6),
    generatedAt: new Date().toISOString()
  };
}

function handleStudents_(params) {
  requireSession_(params.token);

  var students = sortStudentsByRegisterDate_(getStudents_());

  return {
    summary: buildSummary_(students),
    students: students,
    generatedAt: new Date().toISOString()
  };
}

function handleReport_(params) {
  requireSession_(params.token);

  var students = sortStudentsByRegisterDate_(getStudents_());
  var availableYears = getAvailableYears_(students);
  var requestedYear = Number(params.year || availableYears[0] || new Date().getFullYear());
  var selectedYear =
    availableYears.indexOf(requestedYear) > -1 ? requestedYear : availableYears[0];

  return {
    summary: buildSummary_(students),
    selectedYear: selectedYear,
    years: availableYears,
    monthlyRegistrations: buildMonthlyRegistrationSeries_(students, selectedYear),
    generatedAt: new Date().toISOString()
  };
}

function handlePlanner_(params) {
  requireSession_(params.token);

  var weekStartDate = resolvePlannerWeekStart_(params.weekStart);
  var weekEndDate = addDays_(weekStartDate, 6);
  var entries = getPlannerEntries_().filter(function (entry) {
    var entryDate = parseDateValue_(entry.date);

    if (!entryDate) {
      return false;
    }

    return (
      entryDate.getTime() >= weekStartDate.getTime() &&
      entryDate.getTime() <= weekEndDate.getTime()
    );
  });

  return {
    weekStart: formatDateForClient_(weekStartDate),
    weekEnd: formatDateForClient_(weekEndDate),
    generatedAt: new Date().toISOString(),
    days: buildPlannerDays_(weekStartDate, entries)
  };
}

function getAdmins_() {
  return getSheetObjects_(ADMIN_SHEET_NAMES).map(function (row) {
    return {
      admin_id: cleanString_(row.admin_id),
      username: cleanString_(row.username),
      password: cleanString_(row.password),
      full_name: cleanString_(row.full_name),
      role: cleanString_(row.role),
      is_active: row.is_active
    };
  });
}

function getStudents_() {
  return getSheetObjects_(STUDENT_SHEET_NAMES)
    .map(function (row) {
      var rowLookup = buildNormalizedRowLookup_(row);
      var studentId = cleanString_(
        getRowValue_(rowLookup, ["student_id", "hoc_vien_id", "hocvienid", "ma_hoc_vien", "ma_hv"])
      );
      var fullName = cleanString_(getRowValue_(rowLookup, ["full_name", "ho_ten", "hoten"]));
      var courseName = cleanString_(getRowValue_(rowLookup, ["course_name", "khoa_hoc"]));
      var licenseClass = cleanString_(getRowValue_(rowLookup, ["license_class", "hang_hoc"]));
      var status = cleanString_(
        getRowValue_(rowLookup, [
          "learning_status",
          "trang_thai",
          "trang_thai_hoc",
          "status"
        ])
      );
      var feeStatus = cleanString_(
        getRowValue_(rowLookup, ["fee_status", "trang_thai_hoc_phi", "payment_status"])
      );
      var note = cleanString_(getRowValue_(rowLookup, ["note", "notes", "ghi_chu"]));

      return {
        studentId: studentId,
        hocvienId: studentId,
        fullName: fullName,
        birthDate: formatDateForClient_(getRowValue_(rowLookup, ["birth_date", "ngay_sinh"])),
        phone: cleanString_(getRowValue_(rowLookup, ["phone", "sdt", "so_dien_thoai"])),
        courseName: courseName,
        licenseClass: licenseClass,
        sessionType: cleanString_(getRowValue_(rowLookup, ["session_type", "loai_buoi"])),
        status: status,
        learningStatus: status,
        feeStatus: feeStatus,
        datVehicle: cleanString_(getRowValue_(rowLookup, ["dat_xe", "dat_vehicle"])),
        registerDate: formatDateForClient_(getRowValue_(rowLookup, ["register_date", "ngay_dang_ky"])),
        datKm: parseNumber_(getRowValue_(rowLookup, ["km_dat", "dat_km"])),
        tuitionTotal: parseCurrency_(getRowValue_(rowLookup, ["hoc_phi", "tuition_total", "total_fee"])),
        tuitionPaid: parseCurrency_(getRowValue_(rowLookup, ["da_dong", "tuition_paid", "paid_fee"])),
        tuitionDue: parseCurrency_(getRowValue_(rowLookup, ["con_thieu", "tuition_due", "due_fee"])),
        notes: note,
        note: note,
        examResult: cleanString_(getRowValue_(rowLookup, ["ket_qua_thi", "exam_result"])),
        completedDate: formatDateForClient_(
          getRowValue_(rowLookup, ["ngay_hoan_thanh", "completed_date"])
        )
      };
    })
    .filter(function (student) {
      return student.studentId || student.fullName;
    });
}

function getPlannerEntries_() {
  return getSheetObjects_(PLANNER_SHEET_NAMES)
    .map(function (row) {
      var rowLookup = buildNormalizedRowLookup_(row);
      var note = cleanString_(getRowValue_(rowLookup, ["note", "notes", "ghi_chu"]));

      return {
        id: cleanString_(getRowValue_(rowLookup, ["id", "schedule_id", "lich_id"])),
        date: formatDateForClient_(
          getRowValue_(rowLookup, ["date", "ngay", "ngay_hoc", "session_date"])
        ),
        session: normalizePlannerSession_(
          getRowValue_(rowLookup, ["session", "buoi", "ca", "shift"])
        ),
        studentName: cleanString_(
          getRowValue_(rowLookup, ["student_name", "full_name", "ho_ten", "hoc_vien", "ten_hoc_vien"])
        ),
        trainingType: normalizePlannerTrainingType_(
          getRowValue_(rowLookup, ["training_type", "loai_hoc", "training", "hinh_thuc_hoc"])
        ),
        carType: normalizePlannerCarType_(
          getRowValue_(rowLookup, ["car_type", "vehicle_type", "loai_xe"])
        ),
        licensePlate: cleanString_(
          getRowValue_(rowLookup, ["license_plate", "bien_so", "plate_number"])
        ),
        teacherName: cleanString_(
          getRowValue_(rowLookup, ["teacher_name", "instructor", "giao_vien", "phu_trach"])
        ),
        location: cleanString_(getRowValue_(rowLookup, ["location", "dia_diem"])),
        note: note,
        confirmationStatus: cleanString_(
          getRowValue_(rowLookup, ["confirmation_status", "status", "xac_nhan", "trang_thai"])
        )
      };
    })
    .filter(function (entry) {
      return entry.date && entry.session;
    });
}

function buildSummary_(students) {
  var now = new Date();
  var currentMonth = now.getMonth();
  var currentYear = now.getFullYear();

  return students.reduce(
    function (summary, student) {
      var registerDate = parseDateValue_(student.registerDate);
      var status = normalizeText_(student.status);
      var completedDate = parseDateValue_(student.completedDate);

      summary.totalStudents += 1;
      summary.totalTuitionAmount += Number(student.tuitionTotal || 0);
      summary.totalCollectedAmount += Number(student.tuitionPaid || 0);
      summary.totalOutstandingAmount += Number(student.tuitionDue || 0);
      summary.totalDatKm += Number(student.datKm || 0);

      if (status === "dang hoc") {
        summary.activeLearning += 1;
      }

      if (status === "cho thi") {
        summary.waitingExam += 1;
      }

      if (status === "hoan thanh" || completedDate) {
        summary.completedStudents += 1;
      }

      if (hasOutstandingBalance_(student)) {
        summary.feeDebt += 1;
      }

      if (
        registerDate &&
        registerDate.getMonth() === currentMonth &&
        registerDate.getFullYear() === currentYear
      ) {
        summary.newThisMonth += 1;
      }

      return summary;
    },
    {
      totalStudents: 0,
      activeLearning: 0,
      waitingExam: 0,
      completedStudents: 0,
      feeDebt: 0,
      newThisMonth: 0,
      totalTuitionAmount: 0,
      totalCollectedAmount: 0,
      totalOutstandingAmount: 0,
      totalDatKm: 0
    }
  );
}

function buildMonthlyRegistrationSeries_(students, year) {
  var buckets = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];

  students.forEach(function (student) {
    var registerDate = parseDateValue_(student.registerDate);

    if (registerDate && registerDate.getFullYear() === year) {
      buckets[registerDate.getMonth()] += 1;
    }
  });

  return buckets;
}

function getAvailableYears_(students) {
  var years = {};

  students.forEach(function (student) {
    var registerDate = parseDateValue_(student.registerDate);

    if (registerDate) {
      years[registerDate.getFullYear()] = true;
    }
  });

  if (Object.keys(years).length === 0) {
    years[new Date().getFullYear()] = true;
  }

  return Object.keys(years)
    .map(function (year) {
      return Number(year);
    })
    .sort(function (left, right) {
      return right - left;
    });
}

function sortStudentsByRegisterDate_(students) {
  return students.slice().sort(function (left, right) {
    return getDateTimestamp_(right.registerDate) - getDateTimestamp_(left.registerDate);
  });
}

function buildPlannerDays_(weekStartDate, entries) {
  var groupedEntries = entries.reduce(function (lookup, entry) {
    var dateKey = formatDateForClient_(entry.date);
    var entryKey = dateKey + "_" + entry.session;

    if (!lookup[entryKey]) {
      lookup[entryKey] = [];
    }

    lookup[entryKey].push(entry);
    return lookup;
  }, {});

  return Array.apply(null, Array(7)).map(function (_, index) {
    var date = addDays_(weekStartDate, index);
    var dateKey = formatDateForClient_(date);
    var morningEntries = (groupedEntries[dateKey + "_morning"] || []).slice();
    var afternoonEntries = (groupedEntries[dateKey + "_afternoon"] || []).slice();

    morningEntries.sort(sortPlannerEntries_);
    afternoonEntries.sort(sortPlannerEntries_);

    return {
      date: dateKey,
      sessions: {
        morning: morningEntries,
        afternoon: afternoonEntries
      }
    };
  });
}

function sortPlannerEntries_(left, right) {
  var leftName = normalizeText_(left.studentName);
  var rightName = normalizeText_(right.studentName);

  if (leftName < rightName) {
    return -1;
  }

  if (leftName > rightName) {
    return 1;
  }

  return 0;
}

function requireSession_(token) {
  if (!token) {
    throw new Error("Thieu token");
  }

  purgeExpiredSessions_();

  var rawSession = PropertiesService.getScriptProperties().getProperty(SESSION_PREFIX + token);

  if (!rawSession) {
    throw new Error("Phien dang nhap khong hop le");
  }

  var session = JSON.parse(rawSession);

  if (!session.expiresAt || new Date(session.expiresAt).getTime() <= Date.now()) {
    PropertiesService.getScriptProperties().deleteProperty(SESSION_PREFIX + token);
    throw new Error("Phien dang nhap da het han");
  }

  return session;
}

function saveSession_(token, sessionData) {
  PropertiesService.getScriptProperties().setProperty(
    SESSION_PREFIX + token,
    JSON.stringify(sessionData)
  );
}

function purgeExpiredSessions_() {
  var properties = PropertiesService.getScriptProperties().getProperties();

  Object.keys(properties).forEach(function (key) {
    if (key.indexOf(SESSION_PREFIX) !== 0) {
      return;
    }

    try {
      var session = JSON.parse(properties[key]);
      var isExpired = !session.expiresAt || new Date(session.expiresAt).getTime() <= Date.now();

      if (isExpired) {
        PropertiesService.getScriptProperties().deleteProperty(key);
      }
    } catch (error) {
      PropertiesService.getScriptProperties().deleteProperty(key);
    }
  });
}

function getSheetObjects_(sheetNames) {
  var candidateNames = Array.isArray(sheetNames) ? sheetNames : [sheetNames];
  var spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = null;

  for (var index = 0; index < candidateNames.length; index += 1) {
    sheet = spreadsheet.getSheetByName(candidateNames[index]);

    if (sheet) {
      break;
    }
  }

  if (!sheet) {
    throw new Error("Khong tim thay sheet: " + candidateNames.join(" hoac "));
  }

  var values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  var headers = values[0].map(function (header) {
    return cleanString_(header);
  });

  return values.slice(1).filter(hasRowData_).map(function (row) {
    var item = {};

    headers.forEach(function (header, index) {
      item[header] = row[index];
    });

    return item;
  });
}

function buildNormalizedRowLookup_(row) {
  return Object.keys(row).reduce(function (lookup, key) {
    lookup[normalizeHeaderKey_(key)] = row[key];
    return lookup;
  }, {});
}

function getRowValue_(rowLookup, candidateKeys) {
  for (var index = 0; index < candidateKeys.length; index += 1) {
    var candidateKey = normalizeHeaderKey_(candidateKeys[index]);

    if (Object.prototype.hasOwnProperty.call(rowLookup, candidateKey)) {
      return rowLookup[candidateKey];
    }
  }

  return "";
}

function hasRowData_(row) {
  return row.some(function (cell) {
    return cleanString_(cell) !== "";
  });
}

function hasOutstandingBalance_(student) {
  var feeStatus = normalizeText_(student.feeStatus);

  return (
    Number(student.tuitionDue || 0) > 0 ||
    feeStatus.indexOf("no hoc phi") > -1 ||
    feeStatus.indexOf("con thieu") > -1 ||
    feeStatus.indexOf("chua du") > -1 ||
    feeStatus.indexOf("outstanding") > -1 ||
    feeStatus.indexOf("debt") > -1
  );
}

function resolvePlannerWeekStart_(value) {
  var parsedDate = parseDateValue_(value) || new Date();
  var weekStart = new Date(parsedDate.getFullYear(), parsedDate.getMonth(), parsedDate.getDate());
  var day = weekStart.getDay();
  var diff = day === 0 ? -6 : 1 - day;

  weekStart.setDate(weekStart.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);

  return weekStart;
}

function addDays_(date, amount) {
  var nextDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());

  nextDate.setDate(nextDate.getDate() + amount);
  nextDate.setHours(0, 0, 0, 0);

  return nextDate;
}

function normalizePlannerSession_(value) {
  var normalized = normalizeText_(value);

  if (
    normalized === "morning" ||
    normalized === "sang" ||
    normalized === "am" ||
    normalized === "1"
  ) {
    return "morning";
  }

  if (
    normalized === "afternoon" ||
    normalized === "chieu" ||
    normalized === "pm" ||
    normalized === "2"
  ) {
    return "afternoon";
  }

  return "";
}

function normalizePlannerTrainingType_(value) {
  var normalized = normalizeText_(value);

  if (!normalized) {
    return "";
  }

  if (normalized === "dat") {
    return "DAT";
  }

  if (
    normalized.indexOf("yard") > -1 ||
    normalized.indexOf("san tap") > -1 ||
    normalized.indexOf("sa hinh") > -1
  ) {
    return "YARD_PRACTICE";
  }

  if (
    normalized.indexOf("self") > -1 ||
    normalized.indexOf("tu lai") > -1 ||
    normalized.indexOf("duong truong") > -1
  ) {
    return "SELF_DRIVING";
  }

  return cleanString_(value).toUpperCase();
}

function normalizePlannerCarType_(value) {
  var normalized = normalizeText_(value);

  if (!normalized) {
    return "";
  }

  if (
    normalized.indexOf("manual") > -1 ||
    normalized.indexOf("so san") > -1 ||
    normalized.indexOf("tay") > -1
  ) {
    return "MANUAL";
  }

  if (
    normalized.indexOf("automatic") > -1 ||
    normalized.indexOf("tu dong") > -1 ||
    normalized.indexOf("auto") > -1
  ) {
    return "AUTOMATIC";
  }

  return cleanString_(value).toUpperCase();
}

function parseDateValue_(value) {
  if (!value) {
    return null;
  }

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number" && !isNaN(value)) {
    return excelSerialToDate_(value);
  }

  var text = cleanString_(value);

  if (!text) {
    return null;
  }

  if (/^\d+(\.\d+)?$/.test(text)) {
    return excelSerialToDate_(Number(text));
  }

  var ddmmyyyyMatch = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);

  if (ddmmyyyyMatch) {
    return new Date(
      Number(ddmmyyyyMatch[3]),
      Number(ddmmyyyyMatch[2]) - 1,
      Number(ddmmyyyyMatch[1])
    );
  }

  var yyyymmddMatch = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);

  if (yyyymmddMatch) {
    return new Date(
      Number(yyyymmddMatch[1]),
      Number(yyyymmddMatch[2]) - 1,
      Number(yyyymmddMatch[3])
    );
  }

  var parsed = new Date(text);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function getDateTimestamp_(value) {
  var date = parseDateValue_(value);
  return date ? date.getTime() : 0;
}

function formatDateForClient_(value) {
  var date = parseDateValue_(value);

  if (!date) {
    return "";
  }

  return Utilities.formatDate(date, APP_TIMEZONE, "yyyy-MM-dd");
}

function parseCurrency_(value) {
  return parseNumeric_(value);
}

function parseNumber_(value) {
  return parseNumeric_(value);
}

function normalizeBoolean_(value, fallbackValue) {
  if (value === "" || value === null || value === undefined) {
    return fallbackValue;
  }

  if (value === true || value === false) {
    return value;
  }

  var normalized = cleanString_(value).toLowerCase();
  return normalized === "true" || normalized === "1" || normalized === "yes" || normalized === "y";
}

function normalizeText_(value) {
  return cleanString_(value)
    .toLowerCase()
    .replace(/\u0111/g, "d")
    .replace(/\u0110/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeHeaderKey_(value) {
  return normalizeText_(value)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function cleanString_(value) {
  return value === null || value === undefined ? "" : String(value).trim();
}

function parseNumeric_(value) {
  if (value === null || value === undefined || value === "") {
    return 0;
  }

  if (typeof value === "number" && !isNaN(value)) {
    return value;
  }

  var text = cleanString_(value)
    .replace(/\u20ab/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "");
  var parsed = Number(text);

  if (!isNaN(parsed)) {
    return parsed;
  }

  var fallback = text.replace(/[^\d.-]/g, "");
  return fallback ? Number(fallback) : 0;
}

function excelSerialToDate_(serial) {
  if (!serial || isNaN(serial)) {
    return null;
  }

  var wholeDays = Math.floor(serial);
  var fractionalDay = serial - wholeDays;
  var utcDays = wholeDays - 25569;
  var utcValue = utcDays * 86400 * 1000 + Math.round(fractionalDay * 86400 * 1000);

  return new Date(utcValue);
}

function getAction_(e) {
  return cleanString_((e.parameter && e.parameter.action) || "");
}

function jsonSuccess_(data) {
  return ContentService.createTextOutput(
    JSON.stringify({
      success: true,
      data: data
    })
  ).setMimeType(ContentService.MimeType.JSON);
}

function jsonError_(message) {
  return ContentService.createTextOutput(
    JSON.stringify({
      success: false,
      message: message
    })
  ).setMimeType(ContentService.MimeType.JSON);
}
