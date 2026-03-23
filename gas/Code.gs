var ADMIN_SHEET_NAME = "Admins";
var STUDENT_SHEET_NAME = "Students";
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
  var username = String(params.username || "").trim();
  var password = String(params.password || "").trim();

  if (!username || !password) {
    throw new Error("Vui lòng nhập tài khoản và mật khẩu");
  }

  var admin = getAdmins_().find(function (item) {
    return (
      item.username === username &&
      item.password === password &&
      normalizeBoolean_(item.is_active, true)
    );
  });

  if (!admin) {
    throw new Error("Thông tin đăng nhập không hợp lệ");
  }

  purgeExpiredSessions_();

  var token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  var expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();

  saveSession_(token, {
    username: admin.username,
    fullName: admin.full_name,
    role: admin.role || "Quản trị viên",
    expiresAt: expiresAt
  });

  return {
    token: token,
    expiresAt: expiresAt,
    admin: {
      username: admin.username,
      fullName: admin.full_name,
      role: admin.role || "Quản trị viên"
    }
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

  var students = getStudents_();
  var sortedStudents = students.slice().sort(function (left, right) {
    return parseDateValue_(right.registerDate) - parseDateValue_(left.registerDate);
  });

  return {
    summary: buildSummary_(students),
    recentStudents: sortedStudents.slice(0, 6),
    generatedAt: new Date().toISOString()
  };
}

function handleStudents_(params) {
  requireSession_(params.token);

  var students = getStudents_().slice().sort(function (left, right) {
    return parseDateValue_(right.registerDate) - parseDateValue_(left.registerDate);
  });

  return {
    summary: buildSummary_(students),
    students: students,
    generatedAt: new Date().toISOString()
  };
}

function handleReport_(params) {
  requireSession_(params.token);

  var students = getStudents_();
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

function getAdmins_() {
  return getSheetObjects_(ADMIN_SHEET_NAME);
}

function getStudents_() {
  return getSheetObjects_(STUDENT_SHEET_NAME).map(function (row) {
    return {
      studentId: row.student_id || "",
      fullName: row.full_name || "",
      courseName: row.course_name || "",
      licenseClass: row.license_class || "",
      learningStatus: row.learning_status || "",
      feeStatus: row.fee_status || "",
      registerDate: formatDateForClient_(row.register_date),
      phone: row.phone || "",
      note: row.note || ""
    };
  });
}

function buildSummary_(students) {
  var now = new Date();
  var currentMonth = now.getMonth();
  var currentYear = now.getFullYear();

  return students.reduce(
    function (summary, student) {
      var registerDate = parseDateValue_(student.registerDate);
      var learningStatus = String(student.learningStatus || "").toLowerCase();
      var feeStatus = String(student.feeStatus || "").toLowerCase();

      if (learningStatus === "đang học") {
        summary.activeLearning += 1;
      }

      if (learningStatus === "chờ thi") {
        summary.waitingExam += 1;
      }

      if (feeStatus.indexOf("nợ") > -1) {
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
      activeLearning: 0,
      waitingExam: 0,
      feeDebt: 0,
      newThisMonth: 0
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

function requireSession_(token) {
  if (!token) {
    throw new Error("Thiếu token");
  }

  purgeExpiredSessions_();

  var rawSession = PropertiesService.getScriptProperties().getProperty(SESSION_PREFIX + token);

  if (!rawSession) {
    throw new Error("Phiên đăng nhập không hợp lệ");
  }

  var session = JSON.parse(rawSession);

  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    PropertiesService.getScriptProperties().deleteProperty(SESSION_PREFIX + token);
    throw new Error("Phiên đăng nhập đã hết hạn");
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

function getSheetObjects_(sheetName) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);

  if (!sheet) {
    throw new Error("Không tìm thấy sheet: " + sheetName);
  }

  var values = sheet.getDataRange().getValues();

  if (values.length < 2) {
    return [];
  }

  var headers = values[0].map(function (header) {
    return String(header || "").trim();
  });

  return values.slice(1).filter(hasRowData_).map(function (row) {
    var item = {};

    headers.forEach(function (header, index) {
      item[header] = row[index];
    });

    return item;
  });
}

function hasRowData_(row) {
  return row.some(function (cell) {
    return String(cell || "").trim() !== "";
  });
}

function parseDateValue_(value) {
  if (!value) {
    return null;
  }

  if (Object.prototype.toString.call(value) === "[object Date]" && !isNaN(value.getTime())) {
    return value;
  }

  var parsed = new Date(value);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function formatDateForClient_(value) {
  var date = parseDateValue_(value);

  if (!date) {
    return "";
  }

  return Utilities.formatDate(date, APP_TIMEZONE, "yyyy-MM-dd");
}

function normalizeBoolean_(value, fallbackValue) {
  if (value === "" || value === null || value === undefined) {
    return fallbackValue;
  }

  if (value === true || value === false) {
    return value;
  }

  return String(value).toLowerCase() === "true";
}

function getAction_(e) {
  return String((e.parameter && e.parameter.action) || "").trim();
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
