function normalizeTextValue(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replaceAll("\u0111", "d")
    .replaceAll("\u0110", "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function pickFirstValue(source, keys) {
  for (const key of keys) {
    if (!Object.prototype.hasOwnProperty.call(source || {}, key)) {
      continue;
    }

    const value = source[key];

    if (value === null || value === undefined) {
      continue;
    }

    if (typeof value === "string" && value.trim() === "") {
      continue;
    }

    return value;
  }

  return "";
}

function toNullableNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  const normalized = String(value)
    .replace(/\u20ab/g, "")
    .replace(/,/g, "")
    .replace(/\s+/g, "");
  const parsed = Number(normalized);

  if (Number.isFinite(parsed)) {
    return parsed;
  }

  const fallback = normalized.replace(/[^\d.-]/g, "");
  const fallbackParsed = Number(fallback);
  return fallback && Number.isFinite(fallbackParsed) ? fallbackParsed : null;
}

export function normalizeStudentRecord(student = {}) {
  const studentId = String(
    pickFirstValue(student, [
      "studentId",
      "hocvienId",
      "student_id",
      "hoc_vien_id",
      "maHocVien",
      "ma_hoc_vien"
    ]) || ""
  ).trim();
  const fullName = String(
    pickFirstValue(student, ["fullName", "full_name", "hoTen", "ho_ten"]) || ""
  ).trim();
  const courseName = String(
    pickFirstValue(student, ["courseName", "course_name", "khoaHoc", "khoa_hoc"]) || ""
  ).trim();
  const licenseClass = String(
    pickFirstValue(student, ["licenseClass", "license_class", "hangHoc", "hang_hoc"]) || ""
  ).trim();
  const sessionType = String(
    pickFirstValue(student, ["sessionType", "session_type", "loaiBuoi", "loai_buoi"]) || ""
  ).trim();
  const status = String(
    pickFirstValue(student, [
      "status",
      "learningStatus",
      "learning_status",
      "trangThai",
      "trang_thai",
      "trangThaiHoc",
      "trang_thai_hoc"
    ]) || ""
  ).trim();
  const feeStatus = String(
    pickFirstValue(student, [
      "feeStatus",
      "fee_status",
      "trangThaiHocPhi",
      "trang_thai_hoc_phi"
    ]) || ""
  ).trim();
  const notes = String(
    pickFirstValue(student, ["notes", "note", "ghiChu", "ghi_chu"]) || ""
  ).trim();

  return {
    studentId,
    hocvienId: studentId,
    fullName,
    birthDate: String(
      pickFirstValue(student, ["birthDate", "birth_date", "ngaySinh", "ngay_sinh"]) || ""
    ).trim(),
    phone: String(
      pickFirstValue(student, ["phone", "soDienThoai", "so_dien_thoai", "sdt"]) || ""
    ).trim(),
    courseName,
    licenseClass,
    sessionType,
    status,
    learningStatus: status,
    feeStatus,
    datVehicle: String(
      pickFirstValue(student, ["datVehicle", "dat_vehicle", "datXe", "dat_xe", "DAT_xe"]) || ""
    ).trim(),
    registerDate: String(
      pickFirstValue(student, [
        "registerDate",
        "register_date",
        "ngayDangKy",
        "ngay_dang_ky"
      ]) || ""
    ).trim(),
    datKm: toNullableNumber(
      pickFirstValue(student, ["datKm", "dat_km", "kmDAT", "km_DAT", "km_dat"])
    ),
    tuitionTotal: toNullableNumber(
      pickFirstValue(student, ["tuitionTotal", "tuition_total", "hocPhi", "hoc_phi"])
    ),
    tuitionPaid: toNullableNumber(
      pickFirstValue(student, ["tuitionPaid", "tuition_paid", "daDong", "da_dong"])
    ),
    tuitionDue: toNullableNumber(
      pickFirstValue(student, ["tuitionDue", "tuition_due", "conThieu", "con_thieu"])
    ),
    notes,
    note: notes,
    examResult: String(
      pickFirstValue(student, ["examResult", "exam_result", "ketQuaThi", "ket_qua_thi"]) || ""
    ).trim(),
    completedDate: String(
      pickFirstValue(student, [
        "completedDate",
        "completed_date",
        "ngayHoanThanh",
        "ngay_hoan_thanh"
      ]) || ""
    ).trim()
  };
}

export function normalizeStudentCollection(students = []) {
  return Array.isArray(students) ? students.map((student) => normalizeStudentRecord(student)) : [];
}

export function hasMoneyBreakdown(student = {}) {
  const normalizedStudent = normalizeStudentRecord(student);

  return [normalizedStudent.tuitionTotal, normalizedStudent.tuitionPaid, normalizedStudent.tuitionDue].some(
    (value) => value !== null
  );
}

export function hasOutstandingBalance(student = {}) {
  const normalizedStudent = normalizeStudentRecord(student);
  const feeStatus = normalizeTextValue(normalizedStudent.feeStatus);

  return (
    Number(normalizedStudent.tuitionDue || 0) > 0 ||
    feeStatus.includes("no hoc phi") ||
    feeStatus.includes("con thieu") ||
    feeStatus.includes("chua du") ||
    feeStatus.includes("outstanding") ||
    feeStatus.includes("debt")
  );
}

export { normalizeTextValue };
