/**
 * TeacherDashboard.jsx — Professional LMS Instructor Portal
 *
 * Modern LMS Instructor Dashboard built with Bootstrap 5
 * Features:
 *  - Responsive navigation header with instructor profile & active batch indicator
 *  - Prominent SAFE Box At-Risk Students surveillance monitor with risk filter & interventions
 *  - Real-time QR / Barcode Attendance Scanner terminal integration
 *  - Class Session Scheduler (Add session date & start time)
 *  - Study Materials / Tute Cloud Uploader
 *  - KPI Metric cards & dismissible feedback alerts
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getTeacherDashboard,
  getClassStudents,
  getClassSchedule,
  addClassSchedule,
  submitAttendance,
  uploadTute,
} from "../api";
import AttendanceScanner from "../components/AttendanceScanner";

export default function TeacherDashboard() {
  const navigate = useNavigate();

  // ── Main State ────────────────────────────────────────────────────────────
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "at-risk" | "attendance" | "schedules" | "materials"

  // Search & Filters for At-Risk Table
  const [atRiskSearch, setAtRiskSearch] = useState("");
  const [atRiskFilter, setAtRiskFilter] = useState("all"); // "all" | "High Risk" | "Medium Risk"

  // Attendance Module State (Manual Roster)
  const [selectedClassId, setSelectedClassId] = useState("");
  const [schedules, setSchedules] = useState([]);
  const [selectedScheduleId, setSelectedScheduleId] = useState("");
  const [students, setStudents] = useState([]);
  const [attendanceMap, setAttendanceMap] = useState({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);

  // New Schedule Creation State
  const [newSchedClassId, setNewSchedClassId] = useState("");
  const [newSchedDate, setNewSchedDate] = useState("");
  const [newSchedTime, setNewSchedTime] = useState("");
  const [creatingSchedule, setCreatingSchedule] = useState(false);

  // Tute Upload State
  const [tuteClassId, setTuteClassId] = useState("");
  const [tuteTitle, setTuteTitle] = useState("");
  const [tuteUrl, setTuteUrl] = useState("");
  const [tuteLoading, setTuteLoading] = useState(false);

  // Toast / Floating Feedback State
  const [toastMessage, setToastMessage] = useState(null); // { type: string, text: string }

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // ── Fetch Dashboard Data ──────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getTeacherDashboard();
      setDashboardData(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
      } else {
        setError("Failed to load instructor dashboard data. Please try refreshing.");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;
    getTeacherDashboard()
      .then((res) => {
        if (!isMounted) return;
        setDashboardData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoading(false);
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/login");
        } else {
          setError("Failed to load instructor dashboard data. Please try refreshing.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  // ── Computed Teacher Classes ──────────────────────────────────────────────
  const teacherClasses = useMemo(() => {
    if (!dashboardData?.upcoming_schedules) return [];
    return [
      ...new Map(
        dashboardData.upcoming_schedules.map((s) => [
          s.class_id,
          {
            class_id: s.class_id,
            subject_name: s.subject_name,
            grade_level: s.grade_level,
          },
        ])
      ).values(),
    ];
  }, [dashboardData]);

  // Filtered At-Risk Students
  const filteredAtRisk = useMemo(() => {
    if (!dashboardData?.at_risk_students) return [];
    return dashboardData.at_risk_students.filter((student) => {
      const matchSearch = student.student_name
        .toLowerCase()
        .includes(atRiskSearch.toLowerCase());
      const matchFilter =
        atRiskFilter === "all" || student.safe_box_status === atRiskFilter;
      return matchSearch && matchFilter;
    });
  }, [dashboardData, atRiskSearch, atRiskFilter]);

  // ── Attendance Class Change ───────────────────────────────────────────────
  const handleAttendanceClassChange = async (classId) => {
    setSelectedClassId(classId);
    setSelectedScheduleId("");
    setStudents([]);
    setAttendanceMap({});
    if (!classId) {
      setSchedules([]);
      return;
    }
    setScheduleLoading(true);
    try {
      const res = await getClassSchedule(classId);
      setSchedules(res.data || []);
    } catch {
      showToast("danger", "Failed to load sessions for this class.");
      setSchedules([]);
    } finally {
      setScheduleLoading(false);
    }
  };

  // ── Attendance Session Change ─────────────────────────────────────────────
  const handleScheduleChange = async (scheduleId) => {
    setSelectedScheduleId(scheduleId);
    setStudents([]);
    setAttendanceMap({});
    if (!scheduleId || !selectedClassId) return;

    setStudentsLoading(true);
    try {
      const res = await getClassStudents(selectedClassId);
      const studentList = res.data || [];
      setStudents(studentList);
      const defaultMap = {};
      studentList.forEach((s) => {
        defaultMap[s.id] = "Present";
      });
      setAttendanceMap(defaultMap);
    } catch {
      showToast("danger", "Failed to load enrolled students.");
      setStudents([]);
    } finally {
      setStudentsLoading(false);
    }
  };

  const toggleAttendanceStatus = (studentId) => {
    setAttendanceMap((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === "Present" ? "Absent" : "Present",
    }));
  };

  const handleSubmitAttendance = async () => {
    if (!selectedScheduleId || students.length === 0) return;
    setAttendanceLoading(true);
    try {
      await submitAttendance({
        schedule_id: Number(selectedScheduleId),
        records: students.map((s) => ({
          student_id: s.id,
          status: attendanceMap[s.id] || "Present",
          schedule_id: Number(selectedScheduleId),
        })),
      });
      showToast("success", `Attendance recorded successfully for ${students.length} students!`);
    } catch (err) {
      showToast("danger", err.response?.data?.detail || "Failed to submit attendance.");
    } finally {
      setAttendanceLoading(false);
    }
  };

  // ── Handle Add New Class Session ──────────────────────────────────────────
  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!newSchedClassId || !newSchedDate || !newSchedTime) {
      showToast("warning", "Please fill in all session fields.");
      return;
    }

    setCreatingSchedule(true);
    try {
      await addClassSchedule(Number(newSchedClassId), {
        class_id: Number(newSchedClassId),
        session_date: newSchedDate,
        start_time: newSchedTime,
      });

      showToast("success", "New class session added to timetable!");
      setNewSchedDate("");
      setNewSchedTime("");
      setNewSchedClassId("");
      fetchDashboard();
    } catch (err) {
      showToast("danger", err.response?.data?.detail || "Failed to schedule class session.");
    } finally {
      setCreatingSchedule(false);
    }
  };

  // ── Handle Upload Tute ────────────────────────────────────────────────────
  const handleUploadTute = async (e) => {
    e.preventDefault();
    if (!tuteClassId || !tuteTitle.trim() || !tuteUrl.trim()) {
      showToast("warning", "Please fill all document upload fields.");
      return;
    }

    setTuteLoading(true);
    try {
      await uploadTute(Number(tuteClassId), {
        class_id: Number(tuteClassId),
        title: tuteTitle.trim(),
        file_url: tuteUrl.trim(),
      });

      showToast("success", `Study material "${tuteTitle.trim()}" published to student portal!`);
      setTuteTitle("");
      setTuteUrl("");
      setTuteClassId("");
      fetchDashboard();
    } catch (err) {
      showToast("danger", err.response?.data?.detail || "Failed to upload study material.");
    } finally {
      setTuteLoading(false);
    }
  };

  // ── Loading Screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-light text-center py-5">
        <div className="spinner-border text-primary mb-3" style={{ width: "3.5rem", height: "3.5rem" }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h4 className="fw-bold text-dark mb-1">Loading Instructor Portal</h4>
        <p className="text-muted small">Aggregating SAFE Box analytics, student rosters, and schedules...</p>
      </div>
    );
  }

  const teacherName = dashboardData?.teacher_name || "Instructor";
  const atRiskCount = dashboardData?.at_risk_students?.length || 0;
  const upcomingSchedules = dashboardData?.upcoming_schedules || [];
  const totalStudents = dashboardData?.total_students || 0;

  return (
    <div className="bg-light min-vh-100 pb-5" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* ── Toast Notification Alert ─────────────────────────────────────────── */}
      {toastMessage && (
        <div
          className={`alert alert-${toastMessage.type} alert-dismissible fade show shadow-lg position-fixed bottom-0 end-0 m-4`}
          style={{ zIndex: 1080, minWidth: "320px", maxWidth: "450px" }}
          role="alert"
        >
          <div className="d-flex align-items-center">
            <i
              className={`bi ${
                toastMessage.type === "success"
                  ? "bi-check-circle-fill text-success"
                  : toastMessage.type === "danger"
                  ? "bi-exclamation-octagon-fill text-danger"
                  : toastMessage.type === "warning"
                  ? "bi-exclamation-triangle-fill text-warning"
                  : "bi-info-circle-fill text-primary"
              } fs-4 me-2`}
            ></i>
            <div className="small fw-semibold">{toastMessage.text}</div>
          </div>
          <button
            type="button"
            className="btn-close"
            onClick={() => setToastMessage(null)}
            aria-label="Close"
          ></button>
        </div>
      )}

      {/* ── Modern LMS Navigation Bar ─────────────────────────────────────────── */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top shadow-sm py-2">
        <div className="container-fluid px-lg-4">
          {/* Brand */}
          <div className="d-flex align-items-center">
            <div
              className="bg-primary text-white rounded-3 p-2 d-flex align-items-center justify-content-center me-2 shadow-sm"
              style={{ width: "38px", height: "38px" }}
            >
              <i className="bi bi-person-video3 fs-5"></i>
            </div>
            <div>
              <span className="navbar-brand fw-bold mb-0 text-white tracking-wide" style={{ fontSize: "1.15rem" }}>
                EduPortal LMS
              </span>
              <span className="d-none d-sm-inline-block text-secondary small ms-2 border-start ps-2 border-secondary">
                Teacher &amp; Faculty Console
              </span>
            </div>
          </div>

          {/* Quick Actions Right */}
          <div className="d-flex align-items-center gap-2">
            {/* Instructor Profile Chip */}
            <div className="d-flex align-items-center bg-secondary bg-opacity-25 px-3 py-1 rounded-pill text-white border border-secondary border-opacity-25">
              <i className="bi bi-person-badge fs-5 text-primary me-2"></i>
              <div className="text-start">
                <div className="fw-bold small lh-1 text-white">{teacherName}</div>
                <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                  Certified Instructor
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="btn btn-outline-danger btn-sm rounded-pill px-3 ms-1 fw-semibold d-flex align-items-center gap-1"
              title="Sign out of instructor portal"
            >
              <i className="bi bi-box-arrow-right"></i>
              <span className="d-none d-sm-inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Sub-Header & Navigation Tabs ──────────────────────────────────────── */}
      <div className="bg-white border-bottom py-3 shadow-xs mb-4">
        <div className="container-fluid px-lg-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge bg-primary-subtle text-primary fw-semibold px-2.5 py-1 rounded-pill">
                  <i className="bi bi-award me-1"></i> Faculty Portal
                </span>
                <span className="text-muted small">
                  Academic Term 2 Active • SAFE Box Real-Time Sync
                </span>
              </div>
              <h3 className="fw-extrabold text-dark mb-0 tracking-tight">
                Instructor Dashboard: {teacherName}
              </h3>
            </div>

            {/* Tab Navigation Pills */}
            <ul className="nav nav-pills bg-light p-1 rounded-pill border">
              <li className="nav-item">
                <button
                  className={`nav-link rounded-pill py-1.5 px-3 small fw-bold ${
                    activeTab === "overview" ? "active bg-primary text-white shadow-sm" : "text-secondary"
                  }`}
                  onClick={() => setActiveTab("overview")}
                >
                  <i className="bi bi-speedometer2 me-1.5"></i> Overview
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link rounded-pill py-1.5 px-3 small fw-bold ${
                    activeTab === "at-risk"
                      ? "active bg-danger text-white shadow-sm"
                      : atRiskCount > 0
                      ? "text-danger fw-bold"
                      : "text-secondary"
                  }`}
                  onClick={() => setActiveTab("at-risk")}
                >
                  <i className="bi bi-exclamation-triangle-fill me-1.5"></i> At-Risk Students
                  {atRiskCount > 0 && (
                    <span className="badge bg-danger text-white ms-1.5 rounded-pill px-1.5">
                      {atRiskCount}
                    </span>
                  )}
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link rounded-pill py-1.5 px-3 small fw-bold ${
                    activeTab === "attendance" ? "active bg-primary text-white shadow-sm" : "text-secondary"
                  }`}
                  onClick={() => setActiveTab("attendance")}
                >
                  <i className="bi bi-qr-code-scan me-1.5"></i> Attendance Scanner
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link rounded-pill py-1.5 px-3 small fw-bold ${
                    activeTab === "schedules" ? "active bg-primary text-white shadow-sm" : "text-secondary"
                  }`}
                  onClick={() => setActiveTab("schedules")}
                >
                  <i className="bi bi-calendar-plus me-1.5"></i> Schedules
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link rounded-pill py-1.5 px-3 small fw-bold ${
                    activeTab === "materials" ? "active bg-primary text-white shadow-sm" : "text-secondary"
                  }`}
                  onClick={() => setActiveTab("materials")}
                >
                  <i className="bi bi-cloud-arrow-up me-1.5"></i> Upload Tutes
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Main Dashboard Body ───────────────────────────────────────────────── */}
      <div className="container-fluid px-lg-4">
        {error && (
          <div className="alert alert-danger shadow-sm border-0 rounded-3 mb-4" role="alert">
            <i className="bi bi-exclamation-diamond-fill me-2 fs-5"></i>
            {error}
          </div>
        )}

        {/* ── 1. KPI Metric Ribbon ── */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase">Total Enrolled Students</div>
                  <h3 className="fw-bold text-dark mt-1 mb-0">{totalStudents}</h3>
                  <div className="small text-muted mt-1">Across all assigned batches</div>
                </div>
                <div className="bg-primary-subtle text-primary rounded-3 p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-people-fill fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase">Students At Risk</div>
                  <h3 className={`fw-bold mt-1 mb-0 ${atRiskCount > 0 ? "text-danger" : "text-success"}`}>
                    {atRiskCount}
                  </h3>
                  <div className="small text-muted mt-1">
                    {atRiskCount > 0 ? "⚠️ Requires immediate review" : "✅ All students in safe standing"}
                  </div>
                </div>
                <div className={`${atRiskCount > 0 ? "bg-danger-subtle text-danger" : "bg-success-subtle text-success"} rounded-3 p-3 d-flex align-items-center justify-content-center`}>
                  <i className="bi bi-shield-exclamation fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase">Upcoming Sessions</div>
                  <h3 className="fw-bold text-dark mt-1 mb-0">{upcomingSchedules.length}</h3>
                  <div className="small text-muted mt-1">Next 14-day schedule window</div>
                </div>
                <div className="bg-info-subtle text-info rounded-3 p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-calendar-check-fill fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase">Active Class Batches</div>
                  <h3 className="fw-bold text-dark mt-1 mb-0">{teacherClasses.length}</h3>
                  <div className="small text-muted mt-1">Under your instruction</div>
                </div>
                <div className="bg-warning-subtle text-warning rounded-3 p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-mortarboard-fill fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── TAB 1: OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="row g-4">
            {/* Left Column: At Risk Priority Widget + Upcoming Classes */}
            <div className="col-lg-8">
              {/* At-Risk Alert Banner Widget */}
              <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white overflow-hidden">
                <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-exclamation-triangle-fill text-danger fs-5"></i>
                    <h5 className="fw-bold text-dark mb-0">Priority SAFE Box Alerts</h5>
                  </div>
                  <button
                    onClick={() => setActiveTab("at-risk")}
                    className="btn btn-link text-danger p-0 small fw-bold text-decoration-none"
                  >
                    View All At-Risk ({atRiskCount}) &rarr;
                  </button>
                </div>

                <div className="card-body p-0">
                  {atRiskCount === 0 ? (
                    <div className="text-center py-5 px-3">
                      <div className="text-success fs-1 mb-2">
                        <i className="bi bi-check-circle-fill"></i>
                      </div>
                      <h6 className="fw-bold text-dark">No Students Currently At Risk</h6>
                      <p className="text-muted small mb-0">
                        All students in your assigned batches are meeting attendance and term mark benchmarks.
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light text-muted small text-uppercase">
                          <tr>
                            <th className="ps-4">Student</th>
                            <th>Risk Status</th>
                            <th>Attendance</th>
                            <th>Avg Marks</th>
                            <th className="pe-4 text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.at_risk_students.slice(0, 4).map((student) => (
                            <tr key={student.student_id}>
                              <td className="ps-4">
                                <div className="fw-bold text-dark">{student.student_name}</div>
                                <div className="text-muted small">Student ID #{student.student_id}</div>
                              </td>
                              <td>
                                <span
                                  className={`badge ${
                                    student.safe_box_status === "High Risk"
                                      ? "bg-danger text-white"
                                      : "bg-warning text-dark"
                                  } rounded-pill px-2.5 py-1`}
                                >
                                  {student.safe_box_status}
                                </span>
                              </td>
                              <td>
                                <div className="fw-semibold">
                                  {student.overall_attendance_pct != null
                                    ? `${student.overall_attendance_pct.toFixed(1)}%`
                                    : "N/A"}
                                </div>
                              </td>
                              <td>
                                <div className="fw-semibold">
                                  {student.avg_term_marks != null
                                    ? `${student.avg_term_marks.toFixed(1)} pts`
                                    : "N/A"}
                                </div>
                              </td>
                              <td className="pe-4 text-end">
                                <button
                                  onClick={() => setActiveTab("at-risk")}
                                  className="btn btn-outline-danger btn-sm rounded-pill px-3 fw-semibold"
                                >
                                  Investigate
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Upcoming Class Sessions */}
              <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
                <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-calendar-week-fill text-primary fs-5"></i>
                    <h5 className="fw-bold text-dark mb-0">Upcoming Class Sessions (Next 14 Days)</h5>
                  </div>
                  <button
                    onClick={() => setActiveTab("schedules")}
                    className="btn btn-link text-primary p-0 small fw-bold text-decoration-none"
                  >
                    Manage Timetable &rarr;
                  </button>
                </div>

                <div className="card-body p-0">
                  {upcomingSchedules.length === 0 ? (
                    <div className="text-center py-4">
                      <i className="bi bi-calendar-x fs-1 text-muted mb-2"></i>
                      <p className="text-muted small mb-0">No upcoming sessions scheduled in your calendar.</p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light text-muted small text-uppercase">
                          <tr>
                            <th className="ps-4">Subject</th>
                            <th>Grade</th>
                            <th>Date</th>
                            <th>Start Time</th>
                            <th className="pe-4 text-end">Attendance</th>
                          </tr>
                        </thead>
                        <tbody>
                          {upcomingSchedules.map((sch) => (
                            <tr key={sch.schedule_id}>
                              <td className="ps-4">
                                <span className="fw-bold text-dark">{sch.subject_name}</span>
                                <span className="text-muted small ms-2">Batch #{sch.class_id}</span>
                              </td>
                              <td>
                                <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-2.5 py-1">
                                  {sch.grade_level}
                                </span>
                              </td>
                              <td>
                                <div className="fw-semibold text-dark">{sch.session_date}</div>
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border px-2.5 py-1">
                                  <i className="bi bi-clock me-1 text-primary"></i>
                                  {sch.start_time}
                                </span>
                              </td>
                              <td className="pe-4 text-end">
                                <button
                                  onClick={() => setActiveTab("attendance")}
                                  className="btn btn-outline-primary btn-sm rounded-pill fw-semibold px-3"
                                >
                                  Open Scanner
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: Quick Actions & Instructions */}
            <div className="col-lg-4">
              {/* Quick Actions Panel */}
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white mb-4">
                <h6 className="fw-bold text-dark mb-3">⚡ Quick Instructor Actions</h6>
                <div className="d-grid gap-2.5">
                  <button
                    onClick={() => setActiveTab("attendance")}
                    className="btn btn-primary rounded-3 py-2.5 text-start d-flex align-items-center gap-2.5 fw-semibold shadow-xs"
                  >
                    <i className="bi bi-qr-code-scan fs-5"></i>
                    <div>
                      <div>Launch Attendance Scanner</div>
                      <div className="text-white-50 small fw-normal">Scan student QR identity passes</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("schedules")}
                    className="btn btn-outline-primary rounded-3 py-2.5 text-start d-flex align-items-center gap-2.5 fw-semibold"
                  >
                    <i className="bi bi-calendar-plus fs-5"></i>
                    <div>
                      <div>Schedule New Session</div>
                      <div className="text-muted small fw-normal">Publish date and time to students</div>
                    </div>
                  </button>

                  <button
                    onClick={() => setActiveTab("materials")}
                    className="btn btn-outline-secondary rounded-3 py-2.5 text-start d-flex align-items-center gap-2.5 fw-semibold"
                  >
                    <i className="bi bi-cloud-arrow-up fs-5 text-warning"></i>
                    <div>
                      <div>Upload Study Material</div>
                      <div className="text-muted small fw-normal">Add lecture notes and past papers</div>
                    </div>
                  </button>
                </div>
              </div>

              {/* SAFE Box Surveillance Policy */}
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="bi bi-shield-shaded text-primary fs-5"></i>
                  <h6 className="fw-bold text-dark mb-0">SAFE Box Governance Rules</h6>
                </div>
                <p className="small text-muted mb-3">
                  The tuition management system continuously audits each student's progress and alerts instructors when:
                </p>

                <div className="d-flex flex-column gap-2 small">
                  <div className="p-2.5 rounded-3 bg-danger-subtle text-danger-emphasis">
                    <strong>High Risk (Red):</strong> Attendance drops below 75% OR average school term marks drop below 40.
                  </div>
                  <div className="p-2.5 rounded-3 bg-warning-subtle text-warning-emphasis">
                    <strong>Medium Risk (Yellow):</strong> Attendance between 75% - 85% OR term score drops &gt; 15% vs previous term.
                  </div>
                  <div className="p-2.5 rounded-3 bg-success-subtle text-success-emphasis">
                    <strong>Safe (Green):</strong> Attendance exceeds 85% AND average marks &ge; 50.
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: AT-RISK STUDENTS SURVEILLANCE TABLE ── */}
        {activeTab === "at-risk" && (
          <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden p-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
              <div>
                <h5 className="fw-bold text-dark mb-0">⚠️ At-Risk Students Surveillance Roster</h5>
                <p className="text-muted small mb-0">
                  Dynamic SAFE Box flagged students requiring instructional intervention or parent follow-up
                </p>
              </div>

              {/* Search & Filter Controls */}
              <div className="d-flex flex-wrap align-items-center gap-2">
                <div className="input-group input-group-sm" style={{ width: "220px" }}>
                  <span className="input-group-text bg-light border-end-0">
                    <i className="bi bi-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control bg-light border-start-0"
                    placeholder="Search student..."
                    value={atRiskSearch}
                    onChange={(e) => setAtRiskSearch(e.target.value)}
                  />
                </div>

                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn ${atRiskFilter === "all" ? "btn-dark fw-bold" : "btn-outline-secondary"}`}
                    onClick={() => setAtRiskFilter("all")}
                  >
                    All ({atRiskCount})
                  </button>
                  <button
                    type="button"
                    className={`btn ${atRiskFilter === "High Risk" ? "btn-danger fw-bold text-white" : "btn-outline-danger"}`}
                    onClick={() => setAtRiskFilter("High Risk")}
                  >
                    High Risk
                  </button>
                  <button
                    type="button"
                    className={`btn ${atRiskFilter === "Medium Risk" ? "btn-warning fw-bold text-dark" : "btn-outline-warning"}`}
                    onClick={() => setAtRiskFilter("Medium Risk")}
                  >
                    Medium Risk
                  </button>
                </div>
              </div>
            </div>

            {filteredAtRisk.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-shield-check fs-1 text-success mb-2"></i>
                <h6 className="fw-bold text-dark">No Students Match At-Risk Criteria</h6>
                <p className="text-muted small mb-0">No active students match your selected search or risk filters.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light text-muted small text-uppercase">
                    <tr>
                      <th className="ps-4">Student Details</th>
                      <th>SAFE Risk Classification</th>
                      <th>Overall Attendance</th>
                      <th>Term Marks Average</th>
                      <th className="pe-4 text-end">Instructor Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredAtRisk.map((student) => {
                      const isHigh = student.safe_box_status === "High Risk";
                      return (
                        <tr key={student.student_id}>
                          <td className="ps-4">
                            <div className="d-flex align-items-center gap-2.5">
                              <div
                                className={`rounded-circle d-flex align-items-center justify-content-center text-white fw-bold ${
                                  isHigh ? "bg-danger" : "bg-warning text-dark"
                                }`}
                                style={{ width: "36px", height: "36px", minWidth: "36px" }}
                              >
                                {student.student_name.charAt(0)}
                              </div>
                              <div>
                                <div className="fw-bold text-dark">{student.student_name}</div>
                                <div className="text-muted small">Student ID #{student.student_id}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                isHigh
                                  ? "bg-danger text-white border border-danger"
                                  : "bg-warning text-dark border border-warning"
                              } rounded-pill px-3 py-1.5 fw-bold`}
                            >
                              <i className={`bi ${isHigh ? "bi-shield-fill-x" : "bi-shield-fill-exclamation"} me-1`}></i>
                              {student.safe_box_status}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2" style={{ maxWidth: "160px" }}>
                              <div className="progress flex-grow-1" style={{ height: "6px" }}>
                                <div
                                  className={`progress-bar bg-${isHigh ? "danger" : "warning"}`}
                                  style={{ width: `${Math.min(student.overall_attendance_pct || 0, 100)}%` }}
                                ></div>
                              </div>
                              <span className="fw-bold small">
                                {student.overall_attendance_pct != null
                                  ? `${student.overall_attendance_pct.toFixed(1)}%`
                                  : "N/A"}
                              </span>
                            </div>
                          </td>
                          <td>
                            <span className="fw-bold fs-6">
                              {student.avg_term_marks != null
                                ? `${student.avg_term_marks.toFixed(1)}`
                                : "N/A"}
                            </span>
                            <span className="text-muted small ms-1">/ 100</span>
                          </td>
                          <td className="pe-4 text-end">
                            <button
                              onClick={() =>
                                showToast(
                                  "info",
                                  `Initiated parent follow-up protocol for ${student.student_name} (#${student.student_id}).`
                                )
                              }
                              className="btn btn-sm btn-outline-danger rounded-pill fw-semibold px-3"
                            >
                              <i className="bi bi-bell-fill me-1"></i> Alert Parent
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── TAB 3: ATTENDANCE & QR SCANNER TERMINAL ── */}
        {activeTab === "attendance" && (
          <div className="row g-4">
            {/* Live QR / Barcode Scanner Component */}
            <div className="col-lg-6">
              <AttendanceScanner
                teacherClasses={teacherClasses}
                onToast={(type, text) => showToast(type, text)}
              />
            </div>

            {/* Manual Roster Attendance Checklist */}
            <div className="col-lg-6">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="bg-primary-subtle text-primary p-2 rounded-3">
                    <i className="bi bi-ui-checks fs-5"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold text-dark mb-0">Manual Roster Check-In</h5>
                    <p className="text-muted small mb-0">Select class &amp; session to toggle student status</p>
                  </div>
                </div>

                {/* Class Select */}
                <div className="mb-3">
                  <label className="form-label small fw-bold text-secondary">Step 1 — Choose Class Batch</label>
                  <select
                    className="form-select"
                    value={selectedClassId}
                    onChange={(e) => handleAttendanceClassChange(e.target.value)}
                  >
                    <option value="">— Select Class Batch —</option>
                    {teacherClasses.map((c) => (
                      <option key={c.class_id} value={c.class_id}>
                        {c.subject_name} • {c.grade_level} (ID #{c.class_id})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Session Select */}
                {selectedClassId && (
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">Step 2 — Select Scheduled Session</label>
                    {scheduleLoading ? (
                      <div className="text-muted small d-flex align-items-center gap-2">
                        <span className="spinner-border spinner-border-sm text-primary"></span>
                        Loading sessions...
                      </div>
                    ) : schedules.length === 0 ? (
                      <div className="alert alert-warning small mb-0 py-2">
                        No sessions found for this class. Schedule a session first in the Schedules tab.
                      </div>
                    ) : (
                      <select
                        className="form-select"
                        value={selectedScheduleId}
                        onChange={(e) => handleScheduleChange(e.target.value)}
                      >
                        <option value="">— Select Session Date &amp; Time —</option>
                        {schedules.map((sch) => (
                          <option key={sch.schedule_id} value={sch.schedule_id}>
                            {sch.session_date} at {sch.start_time} (Session #{sch.schedule_id})
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                )}

                {/* Students Roster */}
                {selectedScheduleId && (
                  <div className="mt-3">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small fw-bold text-secondary">Step 3 — Mark Present / Absent</span>
                      <span className="badge bg-primary-subtle text-primary">
                        {students.length} Enrolled Students
                      </span>
                    </div>

                    {studentsLoading ? (
                      <div className="text-center py-4">
                        <span className="spinner-border spinner-border-sm text-primary"></span>
                        <div className="text-muted small mt-1">Loading student roster...</div>
                      </div>
                    ) : students.length === 0 ? (
                      <div className="alert alert-light border small text-muted text-center py-3">
                        No students enrolled in this class batch yet.
                      </div>
                    ) : (
                      <>
                        <div
                          className="d-flex flex-column gap-2 mb-3 overflow-auto"
                          style={{ maxHeight: "320px" }}
                        >
                          {students.map((st) => {
                            const isPresent = attendanceMap[st.id] === "Present";
                            return (
                              <div
                                key={st.id}
                                className={`d-flex justify-content-between align-items-center p-2.5 rounded-3 border ${
                                  isPresent ? "bg-success-subtle border-success-subtle" : "bg-danger-subtle border-danger-subtle"
                                }`}
                              >
                                <span className="fw-semibold text-dark small">
                                  {st.full_name} <span className="text-muted">(#{st.id})</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => toggleAttendanceStatus(st.id)}
                                  className={`btn btn-sm rounded-pill fw-bold px-3 ${
                                    isPresent ? "btn-success" : "btn-danger"
                                  }`}
                                >
                                  {isPresent ? "✓ Present" : "✗ Absent"}
                                </button>
                              </div>
                            );
                          })}
                        </div>

                        <button
                          onClick={handleSubmitAttendance}
                          disabled={attendanceLoading}
                          className="btn btn-primary w-100 rounded-pill py-2.5 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                        >
                          {attendanceLoading ? (
                            <>
                              <span className="spinner-border spinner-border-sm" role="status"></span>
                              <span>Saving Attendance...</span>
                            </>
                          ) : (
                            <>
                              <i className="bi bi-check2-circle"></i>
                              <span>Confirm &amp; Submit Attendance</span>
                            </>
                          )}
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 4: SCHEDULE NEW CLASS SESSION ── */}
        {activeTab === "schedules" && (
          <div className="row g-4">
            {/* Create Schedule Form */}
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="bg-primary-subtle text-primary p-2 rounded-3">
                    <i className="bi bi-calendar-plus fs-5"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold text-dark mb-0">Schedule Class Session</h5>
                    <p className="text-muted small mb-0">Add session dates for students to see on their portals</p>
                  </div>
                </div>

                <form onSubmit={handleCreateSchedule}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">Class Batch <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={newSchedClassId}
                      onChange={(e) => setNewSchedClassId(e.target.value)}
                      required
                    >
                      <option value="">— Select Target Class —</option>
                      {teacherClasses.map((c) => (
                        <option key={c.class_id} value={c.class_id}>
                          {c.subject_name} ({c.grade_level})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">Session Date <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      value={newSchedDate}
                      onChange={(e) => setNewSchedDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-bold text-secondary">Start Time <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. 08:30 AM or 14:00"
                      value={newSchedTime}
                      onChange={(e) => setNewSchedTime(e.target.value)}
                      required
                    />
                    <div className="form-text small" style={{ fontSize: "0.72rem" }}>
                      Example: "08:30 AM", "10:00 AM", or "02:00 PM"
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={creatingSchedule}
                    className="btn btn-primary w-100 rounded-pill py-2.5 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                  >
                    {creatingSchedule ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Saving Schedule...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-calendar-check"></i>
                        <span>Publish Session Schedule</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Timetable List */}
            <div className="col-lg-7">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
                <h5 className="fw-bold text-dark mb-1">Scheduled Sessions (Upcoming)</h5>
                <p className="text-muted small mb-3">Live timetable synced across student and parent portals</p>

                {upcomingSchedules.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="bi bi-calendar-x fs-1 text-muted mb-2"></i>
                    <h6 className="fw-bold text-dark">No Scheduled Sessions</h6>
                    <p className="text-muted small mb-0">Use the form on the left to add a session date and time.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light text-muted small text-uppercase">
                        <tr>
                          <th>Subject</th>
                          <th>Grade</th>
                          <th>Session Date</th>
                          <th>Time</th>
                          <th className="text-end">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {upcomingSchedules.map((s) => (
                          <tr key={s.schedule_id}>
                            <td>
                              <span className="fw-bold text-dark">{s.subject_name}</span>
                            </td>
                            <td>
                              <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-2.5 py-1">
                                {s.grade_level}
                              </span>
                            </td>
                            <td>
                              <div className="fw-bold text-dark">{s.session_date}</div>
                            </td>
                            <td>
                              <span className="badge bg-light text-dark border px-2.5 py-1">
                                <i className="bi bi-clock me-1 text-primary"></i>
                                {s.start_time}
                              </span>
                            </td>
                            <td className="text-end">
                              <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1">
                                Live on Portal
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 5: UPLOAD COURSE MATERIALS ── */}
        {activeTab === "materials" && (
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
            <div className="row justify-content-center">
              <div className="col-lg-7">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="bg-warning-subtle text-warning p-2 rounded-3">
                    <i className="bi bi-cloud-arrow-up fs-4"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold text-dark mb-0">Upload Study Material / Tute</h5>
                    <p className="text-muted small mb-0">Distribute PDF notes, assignments, and revision guides directly to student dashboards</p>
                  </div>
                </div>

                <form onSubmit={handleUploadTute}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">Target Class Batch <span className="text-danger">*</span></label>
                    <select
                      className="form-select"
                      value={tuteClassId}
                      onChange={(e) => setTuteClassId(e.target.value)}
                      required
                    >
                      <option value="">— Select Target Class Batch —</option>
                      {teacherClasses.map((c) => (
                        <option key={c.class_id} value={c.class_id}>
                          {c.subject_name} • {c.grade_level} (Class ID #{c.class_id})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">Document / Tute Title <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Chapter 4: Calculus Comprehensive Tutorial Pack"
                      value={tuteTitle}
                      onChange={(e) => setTuteTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-bold text-secondary">Public File URL (Google Drive, AWS S3, Cloud Link) <span className="text-danger">*</span></label>
                    <input
                      type="url"
                      className="form-control"
                      placeholder="https://drive.google.com/file/d/..."
                      value={tuteUrl}
                      onChange={(e) => setTuteUrl(e.target.value)}
                      required
                    />
                    <div className="form-text small" style={{ fontSize: "0.72rem" }}>
                      Provide a publicly accessible link so students can view and download the file.
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={tuteLoading}
                    className="btn btn-primary w-100 rounded-pill py-2.5 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                  >
                    {tuteLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Uploading Document...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-check-fill"></i>
                        <span>Publish Material to Students</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
