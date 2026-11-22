/**
 * AttendanceScanner.jsx — Phase 6 QR & Barcode Attendance Terminal
 *
 * Professional attendance scanner component built with Bootstrap 5
 * Supports:
 *  - USB / Bluetooth barcode & QR scanners (input autofocus & Enter keystroke detection)
 *  - Real-time optimistic check-in with duplicate prevention
 *  - Interactive roster checklist with one-touch toggle (Present / Absent)
 *  - Bulk attendance submission
 */

import { useState, useRef, useEffect } from "react";
import { getClassSchedule, getClassStudents, submitAttendance } from "../api";

export default function AttendanceScanner({ teacherClasses = [], onToast }) {
  const [classId, setClassId] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [scheduleId, setScheduleId] = useState("");
  const [students, setStudents] = useState([]); // enrolled students
  const [attended, setAttended] = useState([]); // student_ids marked present
  const [scanInput, setScanInput] = useState("");
  const [schLoading, setSchLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [lastScanned, setLastScanned] = useState(null); // { name, id, ok, reason }
  const scanRef = useRef(null);

  // Keep scanner input focused for USB / Bluetooth hardware scanners
  useEffect(() => {
    if (scheduleId) {
      scanRef.current?.focus();
    }
  }, [scheduleId]);

  // Load schedules and students when class changes
  const handleClassChange = async (cid) => {
    setClassId(cid);
    setScheduleId("");
    setSchedules([]);
    setStudents([]);
    setAttended([]);
    setLastScanned(null);
    if (!cid) return;

    setSchLoading(true);
    try {
      const [schRes, stuRes] = await Promise.all([
        getClassSchedule(cid),
        getClassStudents(cid),
      ]);
      setSchedules(schRes.data || []);
      setStudents(stuRes.data || []);
    } catch {
      onToast("danger", "Failed to load class sessions and students.");
    } finally {
      setSchLoading(false);
    }
  };

  // When teacher scans or enters a student ID
  const handleScan = async (e) => {
    e.preventDefault();
    const rawId = scanInput.trim();
    if (!rawId || !scheduleId) return;

    // Check if input is a JSON string from QR code pass (e.g. { "student_id": 1, ... })
    let studentId = null;
    try {
      const parsed = JSON.parse(rawId);
      if (parsed && parsed.student_id) {
        studentId = Number(parsed.student_id);
      }
    } catch {
      studentId = Number(rawId.replace("#", ""));
    }

    if (!studentId || isNaN(studentId) || studentId <= 0) {
      onToast("warning", `"${rawId}" is not a valid student ID.`);
      setScanInput("");
      return;
    }

    // Check enrollment
    const student = students.find((s) => s.id === studentId);
    if (!student) {
      setLastScanned({
        id: studentId,
        name: `#${studentId}`,
        ok: false,
        reason: "Not enrolled in this class batch",
      });
      onToast("danger", `Student #${studentId} is not enrolled in this class batch.`);
      setScanInput("");
      return;
    }

    // Check if already checked in
    if (attended.includes(studentId)) {
      onToast("warning", `${student.full_name} is already checked in.`);
      setScanInput("");
      return;
    }

    // Add to attended list optimistically
    setAttended((prev) => [...prev, studentId]);
    setLastScanned({ id: studentId, name: student.full_name, ok: true });
    setScanInput("");
    onToast("success", `✓ ${student.full_name} checked in as Present!`);
  };

  // Submit all attendance records
  const handleSubmitAll = async () => {
    if (!scheduleId || students.length === 0) return;
    setSubmitLoading(true);
    try {
      const records = students.map((s) => ({
        student_id: s.id,
        schedule_id: Number(scheduleId),
        status: attended.includes(s.id) ? "Present" : "Absent",
      }));
      await submitAttendance({ schedule_id: Number(scheduleId), records });
      onToast(
        "success",
        `Attendance recorded: ${attended.length} Present, ${students.length - attended.length} Absent.`
      );
    } catch (err) {
      onToast("danger", err.response?.data?.detail || "Failed to submit attendance.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const selectedSchedule = schedules.find((s) => String(s.schedule_id) === String(scheduleId));

  return (
    <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
      <div className="d-flex align-items-center gap-2 mb-3">
        <div className="bg-primary-subtle text-primary p-2 rounded-3">
          <i className="bi bi-qr-code-scan fs-4"></i>
        </div>
        <div>
          <h5 className="fw-bold text-dark mb-0">QR &amp; Barcode Attendance Terminal</h5>
          <p className="text-muted small mb-0">Live check-in via hardware barcode scanner or student QR pass</p>
        </div>
      </div>

      <div className="row g-3 mb-3">
        {/* Class Batch Selector */}
        <div className="col-sm-6">
          <label className="form-label small fw-bold text-secondary">Step 1 — Target Class Batch</label>
          <select
            className="form-select"
            value={classId}
            onChange={(e) => handleClassChange(e.target.value)}
          >
            <option value="">— Select Class Batch —</option>
            {teacherClasses.map((c) => (
              <option key={c.class_id} value={c.class_id}>
                {c.subject_name} • {c.grade_level}
              </option>
            ))}
          </select>
        </div>

        {/* Schedule Selector */}
        <div className="col-sm-6">
          <label className="form-label small fw-bold text-secondary">Step 2 — Session Date &amp; Time</label>
          {schLoading ? (
            <div className="text-muted small d-flex align-items-center gap-2 pt-2">
              <span className="spinner-border spinner-border-sm text-primary"></span>
              Loading sessions...
            </div>
          ) : (
            <select
              className="form-select"
              value={scheduleId}
              onChange={(e) => {
                setScheduleId(e.target.value);
                setAttended([]);
                setLastScanned(null);
              }}
              disabled={!classId || schedules.length === 0}
            >
              <option value="">— Select Class Session —</option>
              {schedules.map((s) => (
                <option key={s.schedule_id} value={s.schedule_id}>
                  {s.session_date} at {s.start_time}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {scheduleId && (
        <>
          {/* Active Session Info Banner */}
          {selectedSchedule && (
            <div className="alert alert-primary bg-primary-subtle border-0 rounded-3 p-3 mb-3 d-flex justify-content-between align-items-center">
              <div className="d-flex align-items-center gap-2 small">
                <i className="bi bi-calendar-check-fill text-primary fs-5"></i>
                <span className="fw-bold text-dark">
                  {selectedSchedule.session_date} at {selectedSchedule.start_time}
                </span>
              </div>
              <span className="badge bg-primary rounded-pill px-3 py-1.5 fw-bold">
                {attended.length} / {students.length} Checked In
              </span>
            </div>
          )}

          {/* Scanner Input Group */}
          <div className="mb-3">
            <label className="form-label small fw-bold text-secondary">
              Step 3 — Scan QR Code / Input Student ID <span className="text-danger">*</span>
            </label>
            <form onSubmit={handleScan}>
              <div className="input-group">
                <span className="input-group-text bg-light text-primary">
                  <i className="bi bi-upc-scan fs-5"></i>
                </span>
                <input
                  ref={scanRef}
                  type="text"
                  className="form-control font-monospace fw-bold fs-6 py-2"
                  placeholder="Scan QR or type Student ID (e.g. 1)"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  autoFocus
                />
                <button type="submit" className="btn btn-primary fw-bold px-3">
                  Check-in ✓
                </button>
              </div>
              <div className="form-text small" style={{ fontSize: "0.72rem" }}>
                Hardware scanners type directly into this focused field and send [Enter] automatically.
              </div>
            </form>
          </div>

          {/* Last Scanned Feedback Banner */}
          {lastScanned && (
            <div
              className={`alert ${
                lastScanned.ok ? "alert-success border-success-subtle" : "alert-danger border-danger-subtle"
              } rounded-3 p-2.5 mb-3 d-flex align-items-center gap-2.5 small`}
            >
              <i
                className={`bi ${lastScanned.ok ? "bi-check-circle-fill text-success" : "bi-x-circle-fill text-danger"} fs-5`}
              ></i>
              <div className="flex-grow-1">
                {lastScanned.ok ? (
                  <span>
                    <strong>{lastScanned.name}</strong> was marked <strong>Present</strong>!
                  </span>
                ) : (
                  <span>
                    <strong>Student #{lastScanned.id}:</strong> {lastScanned.reason}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Live Roster Badges (Toggleable) */}
          {students.length > 0 && (
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <span className="small fw-bold text-secondary">Live Session Roster ({students.length})</span>
                <span className="text-muted small" style={{ fontSize: "0.72rem" }}>
                  Click any student chip to toggle status
                </span>
              </div>
              <div
                className="d-flex flex-wrap gap-1.5 overflow-auto p-2 bg-light rounded-3 border"
                style={{ maxHeight: "170px" }}
              >
                {students.map((s) => {
                  const isPresent = attended.includes(s.id);
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() =>
                        setAttended((prev) =>
                          isPresent ? prev.filter((id) => id !== s.id) : [...prev, s.id]
                        )
                      }
                      className={`btn btn-sm rounded-pill fw-semibold py-1 px-2.5 d-flex align-items-center gap-1.5 ${
                        isPresent
                          ? "btn-success shadow-xs text-white"
                          : "btn-outline-secondary border-opacity-50 text-dark bg-white"
                      }`}
                      style={{ fontSize: "0.78rem" }}
                    >
                      <i className={`bi ${isPresent ? "bi-check2" : "bi-circle"}`}></i>
                      <span>{s.full_name}</span>
                      <span className="opacity-75 font-monospace">#{s.id}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Bulk Submit Attendance Button */}
          {students.length > 0 && (
            <button
              onClick={handleSubmitAll}
              disabled={submitLoading}
              className="btn btn-primary w-100 rounded-pill py-2.5 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2 mt-auto"
            >
              {submitLoading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status"></span>
                  <span>Saving Attendance Records...</span>
                </>
              ) : (
                <>
                  <i className="bi bi-cloud-arrow-up-fill"></i>
                  <span>
                    Commit Attendance ({attended.length} Present / {students.length - attended.length} Absent)
                  </span>
                </>
              )}
            </button>
          )}
        </>
      )}

      {!classId && teacherClasses.length === 0 && (
        <div className="text-center py-5 text-muted small">
          <i className="bi bi-calendar-x fs-1 mb-2 d-block"></i>
          No classes found. You must be assigned to an active class batch to record attendance.
        </div>
      )}
    </div>
  );
}
