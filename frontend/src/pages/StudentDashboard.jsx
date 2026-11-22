/**
 * StudentDashboard.jsx — Modern LMS Student Portal
 *
 * Professional Learning Management System (LMS) dashboard styled with Bootstrap 5
 * Features:
 *  - Header navigation bar with student profile & quick QR pass toggle
 *  - High-visibility color-coded SAFE Box Academic Risk Monitor
 *  - Modern Metric KPI cards
 *  - Tabbed LMS Navigation: Overview, Classes & Schedule, Course Materials (Tutes), Gradebook & Marks
 *  - Interactive School Term Marks submission & history viewer with grading scales
 *  - Student QR Attendance Identity Pass via qrcode.react
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { QRCodeSVG } from "qrcode.react";
import { getStudentDashboard, getStudentMarks, submitTermMarks } from "../api";

export default function StudentDashboard() {
  const navigate = useNavigate();

  // ── State ─────────────────────────────────────────────────────────────────
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "classes" | "materials" | "gradebook"

  // Term marks form & history state
  const [subjectName, setSubjectName] = useState("");
  const [termNumber, setTermNumber] = useState("1");
  const [marksValue, setMarksValue] = useState("");
  const [submittingMarks, setSubmittingMarks] = useState(false);
  const [marksHistory, setMarksHistory] = useState([]);
  const [loadingMarks, setLoadingMarks] = useState(false);
  const [selectedTermFilter, setSelectedTermFilter] = useState("all");

  // Materials search & filter
  const [materialSearch, setMaterialSearch] = useState("");
  const [materialSubjectFilter, setMaterialSubjectFilter] = useState("all");

  // QR Modal toggle
  const [showQRModal, setShowQRModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // Toast / feedback message
  const [toastMessage, setToastMessage] = useState(null); // { type: "success" | "danger" | "warning" | "info", text: string }

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
      const res = await getStudentDashboard();
      setData(res.data);
    } catch (err) {
      if (err.response?.status !== 401) {
        setError(err.response?.data?.detail || "Failed to load dashboard data. Please try refreshing.");
      }
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Fetch Marks History ───────────────────────────────────────────────────
  const fetchMarksHistory = useCallback(async () => {
    setLoadingMarks(true);
    try {
      const res = await getStudentMarks();
      setMarksHistory(res.data || []);
    } catch (err) {
      console.error("Failed to load marks history", err);
    } finally {
      setLoadingMarks(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    getStudentDashboard()
      .then((res) => {
        if (!isMounted) return;
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoading(false);
        if (err.response?.status !== 401) {
          setError(err.response?.data?.detail || "Failed to load dashboard data. Please try refreshing.");
        }
      });

    getStudentMarks()
      .then((res) => {
        if (!isMounted) return;
        setMarksHistory(res.data || []);
        setLoadingMarks(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoadingMarks(false);
        console.error("Failed to load marks history", err);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  const handleCopyStudentId = () => {
    if (!data?.safe_box?.student_id) return;
    navigator.clipboard?.writeText(String(data.safe_box.student_id)).then(() => {
      setCopiedId(true);
      showToast("info", `Student ID #${data.safe_box.student_id} copied to clipboard!`);
      setTimeout(() => setCopiedId(false), 2000);
    });
  };

  // ── Submit Marks Handler ──────────────────────────────────────────────────
  const handleMarksSubmit = async (e) => {
    e.preventDefault();
    const studentId = data?.safe_box?.student_id;
    if (!studentId) {
      showToast("danger", "Student profile not identified. Please refresh the page.");
      return;
    }

    const numMarks = parseFloat(marksValue);
    if (isNaN(numMarks) || numMarks < 0 || numMarks > 100) {
      showToast("warning", "Please enter valid marks between 0 and 100.");
      return;
    }

    setSubmittingMarks(true);
    try {
      await submitTermMarks({
        student_id: studentId,
        subject_name: subjectName.trim(),
        term_number: parseInt(termNumber, 10),
        marks: numMarks,
      });

      showToast("success", `Marks recorded for ${subjectName.trim()} (Term ${termNumber}: ${numMarks} marks)!`);
      setSubjectName("");
      setMarksValue("");
      // Refresh marks list and dashboard metrics
      fetchMarksHistory();
      fetchDashboard();
    } catch (err) {
      showToast("danger", err.response?.data?.detail || "Failed to submit marks. Please try again.");
    } finally {
      setSubmittingMarks(false);
    }
  };

  // ── Helper: Grade Calculator ──────────────────────────────────────────────
  const getGradeInfo = (marks) => {
    if (marks == null || isNaN(marks)) return { grade: "—", label: "N/A", color: "secondary" };
    if (marks >= 75) return { grade: "A", label: "Distinction", color: "success" };
    if (marks >= 65) return { grade: "B", label: "Very Good", color: "primary" };
    if (marks >= 50) return { grade: "C", label: "Credit", color: "info" };
    if (marks >= 35) return { grade: "S", label: "Ordinary Pass", color: "warning" };
    return { grade: "F", label: "Needs Support", color: "danger" };
  };

  // ── Computed Variables ────────────────────────────────────────────────────
  const upcoming = useMemo(() => data?.upcoming_schedules || [], [data?.upcoming_schedules]);
  const tutes = useMemo(() => data?.downloadable_tutes || [], [data?.downloadable_tutes]);
  const safeBox = data?.safe_box;
  const studentId = safeBox?.student_id;
  const studentName = data?.student_name || "Student";

  // Unique subjects for filtering
  const allSubjects = useMemo(() => {
    const subs = new Set();
    tutes.forEach((t) => t.subject_name && subs.add(t.subject_name));
    upcoming.forEach((s) => s.subject_name && subs.add(s.subject_name));
    marksHistory.forEach((m) => m.subject_name && subs.add(m.subject_name));
    return Array.from(subs);
  }, [tutes, upcoming, marksHistory]);

  // Filtered materials
  const filteredMaterials = useMemo(() => {
    return tutes.filter((tute) => {
      const matchSearch =
        tute.title.toLowerCase().includes(materialSearch.toLowerCase()) ||
        tute.subject_name.toLowerCase().includes(materialSearch.toLowerCase());
      const matchSubject =
        materialSubjectFilter === "all" || tute.subject_name === materialSubjectFilter;
      return matchSearch && matchSubject;
    });
  }, [tutes, materialSearch, materialSubjectFilter]);

  // Filtered marks history
  const filteredMarks = useMemo(() => {
    if (selectedTermFilter === "all") return marksHistory;
    return marksHistory.filter((m) => String(m.term_number) === selectedTermFilter);
  }, [marksHistory, selectedTermFilter]);

  // Compute average of recorded marks
  const averageMarksRecorded = useMemo(() => {
    if (!marksHistory.length) return null;
    const sum = marksHistory.reduce((acc, curr) => acc + curr.marks, 0);
    return (sum / marksHistory.length).toFixed(1);
  }, [marksHistory]);

  // SAFE Box visual theme
  const safeBoxTheme = useMemo(() => {
    const status = safeBox?.status || "Safe";
    if (status === "High Risk") {
      return {
        cardClass: "border-danger bg-danger-subtle text-danger-emphasis",
        badgeClass: "bg-danger text-white",
        icon: "bi-shield-fill-x",
        accent: "danger",
        title: "High Risk — Academic Intervention Needed",
        summaryText: "Your attendance is below 75% or your average marks are below 40. Immediate remedial action is recommended.",
      };
    }
    if (status === "Medium Risk") {
      return {
        cardClass: "border-warning bg-warning-subtle text-warning-emphasis",
        badgeClass: "bg-warning text-dark",
        icon: "bi-shield-fill-exclamation",
        accent: "warning",
        title: "Medium Risk — Attention Recommended",
        summaryText: "Your attendance is in the 75% - 85% range or term marks dropped by over 15 points. Focus on upcoming sessions.",
      };
    }
    return {
      cardClass: "border-success bg-success-subtle text-success-emphasis",
      badgeClass: "bg-success text-white",
      icon: "bi-shield-fill-check",
      accent: "success",
      title: "Safe Status — In Good Standing",
      summaryText: "Excellent work! Attendance exceeds 85% and average marks satisfy academic excellence thresholds.",
    };
  }, [safeBox]);

  // ── Loading Screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-light text-center py-5">
        <div className="spinner-border text-primary mb-3" style={{ width: "3.5rem", height: "3.5rem" }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h4 className="fw-bold text-dark mb-1">Loading LMS Student Portal</h4>
        <p className="text-muted small">Synchronizing your classes, grades, and SAFE Box metrics...</p>
      </div>
    );
  }

  return (
    <div className="bg-light min-vh-100 pb-5" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* ── Toast Notification Floating Alert ─────────────────────────────────── */}
      {toastMessage && (
        <div
          className={`alert alert-${toastMessage.type} alert-dismissible fade show shadow-lg position-fixed bottom-0 end-0 m-4`}
          style={{ zIndex: 1080, minWidth: "320px", maxWidth: "450px" }}
          role="alert"
        >
          <div className="d-flex align-items-center">
            <i
              className={`bi ${toastMessage.type === "success"
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
              <i className="bi bi-mortarboard-fill fs-5"></i>
            </div>
            <div>
              <span className="navbar-brand fw-bold mb-0 text-white tracking-wide" style={{ fontSize: "1.15rem" }}>
                EduPortal LMS
              </span>
              <span className="d-none d-sm-inline-block text-secondary small ms-2 border-start ps-2 border-secondary">
                Tuition Management System
              </span>
            </div>
          </div>

          {/* Quick Actions Right */}
          <div className="d-flex align-items-center gap-2">
            {/* Quick QR Attendance Pass Button */}
            <button
              onClick={() => setShowQRModal(true)}
              className="btn btn-outline-light btn-sm d-flex align-items-center gap-2 px-3 rounded-pill fw-semibold shadow-sm"
            >
              <i className="bi bi-qr-code text-info"></i>
              <span className="d-none d-md-inline">My Attendance QR</span>
            </button>

            {/* Student Profile Chip */}
            <div className="d-none d-md-flex align-items-center bg-secondary bg-opacity-25 px-3 py-1 rounded-pill text-white border border-secondary border-opacity-25">
              <i className="bi bi-person-circle fs-5 text-primary me-2"></i>
              <div className="text-start">
                <div className="fw-bold small lh-1 text-white">{studentName}</div>
                <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                  ID #{studentId || "—"}
                </div>
              </div>
            </div>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="btn btn-outline-danger btn-sm rounded-pill px-3 ms-1 fw-semibold d-flex align-items-center gap-1"
              title="Sign out of student account"
            >
              <i className="bi bi-box-arrow-right"></i>
              <span className="d-none d-sm-inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── LMS Sub-Header & Breadcrumbs ──────────────────────────────────────── */}
      <div className="bg-white border-bottom py-3 shadow-xs mb-4">
        <div className="container-fluid px-lg-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge bg-primary-subtle text-primary fw-semibold px-2.5 py-1 rounded-pill">
                  <i className="bi bi-person-check me-1"></i> Student Portal
                </span>
                <span className="text-muted small">
                  Academic Year 2026 • Term 2 Active
                </span>
              </div>
              <h3 className="fw-extrabold text-dark mb-0 tracking-tight">
                Welcome back, {studentName}! 👋
              </h3>
            </div>

            {/* Tab Navigation Pills */}
            <ul className="nav nav-pills bg-light p-1 rounded-pill border">
              <li className="nav-item">
                <button
                  className={`nav-link rounded-pill py-1.5 px-3 small fw-bold ${activeTab === "overview" ? "active bg-primary text-white shadow-sm" : "text-secondary"
                    }`}
                  onClick={() => setActiveTab("overview")}
                >
                  <i className="bi bi-speedometer2 me-1.5"></i> Overview
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link rounded-pill py-1.5 px-3 small fw-bold ${activeTab === "classes" ? "active bg-primary text-white shadow-sm" : "text-secondary"
                    }`}
                  onClick={() => setActiveTab("classes")}
                >
                  <i className="bi bi-calendar3 me-1.5"></i> Classes
                  {upcoming.length > 0 && (
                    <span className="badge bg-white text-primary ms-1.5 rounded-pill px-1.5">
                      {upcoming.length}
                    </span>
                  )}
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link rounded-pill py-1.5 px-3 small fw-bold ${activeTab === "materials" ? "active bg-primary text-white shadow-sm" : "text-secondary"
                    }`}
                  onClick={() => setActiveTab("materials")}
                >
                  <i className="bi bi-folder2-open me-1.5"></i> Tutes & Notes
                  {tutes.length > 0 && (
                    <span className="badge bg-white text-primary ms-1.5 rounded-pill px-1.5">
                      {tutes.length}
                    </span>
                  )}
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link rounded-pill py-1.5 px-3 small fw-bold ${activeTab === "gradebook" ? "active bg-primary text-white shadow-sm" : "text-secondary"
                    }`}
                  onClick={() => setActiveTab("gradebook")}
                >
                  <i className="bi bi-award me-1.5"></i> Gradebook
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Main Dashboard Container ─────────────────────────────────────────── */}
      <div className="container-fluid px-lg-4">
        {error && (
          <div className="alert alert-danger shadow-sm border-0 rounded-3 mb-4" role="alert">
            <i className="bi bi-exclamation-diamond-fill me-2 fs-5"></i>
            {error}
          </div>
        )}

        {/* ────────────────────────────────────────────────────────────────────────
            1. LARGE COLOR-CODED SAFE BOX ACADEMIC RISK MONITOR (Prominent Header)
           ──────────────────────────────────────────────────────────────────────── */}
        <div className={`card border-2 shadow-sm rounded-4 mb-4 overflow-hidden ${safeBoxTheme.cardClass}`}>
          <div className="card-body p-4">
            <div className="row align-items-center g-4">
              {/* Left Column: Status Badge & Icon */}
              <div className="col-lg-6 col-md-7">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div
                    className={`rounded-circle d-flex align-items-center justify-content-center bg-white shadow-sm`}
                    style={{ width: "54px", height: "54px", minWidth: "54px" }}
                  >
                    <i className={`bi ${safeBoxTheme.icon} fs-2 text-${safeBoxTheme.accent}`}></i>
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge ${safeBoxTheme.badgeClass} rounded-pill px-3 py-1.5 text-uppercase fw-bold tracking-wider small`}>
                        SAFE Box: {safeBox?.status || "Safe"}
                      </span>
                      <span className="text-muted small">Dynamic Risk Assessment</span>
                    </div>
                    <h4 className="fw-extrabold mb-0 mt-1">{safeBoxTheme.title}</h4>
                  </div>
                </div>

                <p className="mb-3 opacity-90 small lh-base">
                  {safeBoxTheme.summaryText}
                </p>

                {/* Specific Risk Trigger Explanations */}
                {safeBox?.reasons && safeBox.reasons.length > 0 && (
                  <div className="bg-white bg-opacity-75 p-3 rounded-3 border border-opacity-25 small mb-0">
                    <div className="fw-bold mb-1 text-dark d-flex align-items-center gap-1.5">
                      <i className="bi bi-info-circle-fill text-primary"></i> Assessment Breakdown:
                    </div>
                    <ul className="mb-0 ps-3">
                      {safeBox.reasons.map((reason, idx) => (
                        <li key={idx} className="text-secondary fw-medium">
                          {reason}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Right Column: Visual Academic Gauges / Key Metrics */}
              <div className="col-lg-6 col-md-5">
                <div className="row g-3">
                  {/* Attendance Card Gauge */}
                  <div className="col-6">
                    <div className="card border-0 bg-white shadow-xs rounded-3 p-3 text-center h-100">
                      <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}>
                        Overall Attendance
                      </div>
                      <div className="my-2">
                        <span className={`display-6 fw-extrabold text-${safeBoxTheme.accent}`}>
                          {safeBox?.overall_attendance_pct != null
                            ? `${safeBox.overall_attendance_pct.toFixed(1)}%`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="progress" style={{ height: "7px" }}>
                        <div
                          className={`progress-bar bg-${safeBoxTheme.accent}`}
                          role="progressbar"
                          style={{
                            width: `${Math.min(safeBox?.overall_attendance_pct || 0, 100)}%`,
                          }}
                          aria-valuenow={safeBox?.overall_attendance_pct || 0}
                          aria-valuemin="0"
                          aria-valuemax="100"
                        ></div>
                      </div>
                      <div className="d-flex justify-content-between text-muted mt-1.5" style={{ fontSize: "0.68rem" }}>
                        <span>Target: &gt;85%</span>
                        <span>Min: 75%</span>
                      </div>
                    </div>
                  </div>

                  {/* Marks Average Card */}
                  <div className="col-6">
                    <div className="card border-0 bg-white shadow-xs rounded-3 p-3 text-center h-100">
                      <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.72rem", letterSpacing: "0.5px" }}>
                        Average Term Score
                      </div>
                      <div className="my-2">
                        <span className="display-6 fw-extrabold text-dark">
                          {safeBox?.avg_term_marks != null ? safeBox.avg_term_marks.toFixed(1) : "—"}
                        </span>
                        <span className="text-muted small"> / 100</span>
                      </div>
                      <div className="mt-auto">
                        <span className={`badge bg-${getGradeInfo(safeBox?.avg_term_marks).color}-subtle text-${getGradeInfo(safeBox?.avg_term_marks).color} rounded-pill px-2.5 py-1 fw-bold small`}>
                          Grade {getGradeInfo(safeBox?.avg_term_marks).grade} ({getGradeInfo(safeBox?.avg_term_marks).label})
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────────────
            2. TOP KPI QUICK-STATS RIBBON
           ──────────────────────────────────────────────────────────────────────── */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-sm-6">
            <div className="card border-0 shadow-sm rounded-3 h-100 p-3 bg-white">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase">30-Day Attendance</div>
                  <h3 className="fw-bold text-dark mt-1 mb-0">
                    {data?.recent_attendance_pct != null ? `${data.recent_attendance_pct.toFixed(1)}%` : "N/A"}
                  </h3>
                  <div className="small text-muted mt-1">
                    <i className="bi bi-clock-history me-1 text-primary"></i> Last 30 days active
                  </div>
                </div>
                <div className="bg-primary-subtle text-primary rounded-3 p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-calendar-check-fill fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card border-0 shadow-sm rounded-3 h-100 p-3 bg-white">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase">Upcoming Classes</div>
                  <h3 className="fw-bold text-dark mt-1 mb-0">{upcoming.length}</h3>
                  <div className="small text-muted mt-1">
                    <i className="bi bi-calendar-event me-1 text-info"></i> In next 14 days
                  </div>
                </div>
                <div className="bg-info-subtle text-info rounded-3 p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-mortarboard fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card border-0 shadow-sm rounded-3 h-100 p-3 bg-white">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase">Study Materials</div>
                  <h3 className="fw-bold text-dark mt-1 mb-0">{tutes.length}</h3>
                  <div className="small text-muted mt-1">
                    <i className="bi bi-file-earmark-arrow-down me-1 text-success"></i> Downloadable notes
                  </div>
                </div>
                <div className="bg-success-subtle text-success rounded-3 p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-journal-bookmark-fill fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-xl-3 col-sm-6">
            <div className="card border-0 shadow-sm rounded-3 h-100 p-3 bg-white">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase">Recorded Tests</div>
                  <h3 className="fw-bold text-dark mt-1 mb-0">{marksHistory.length}</h3>
                  <div className="small text-muted mt-1">
                    <i className="bi bi-graph-up me-1 text-purple"></i> Avg: {averageMarksRecorded ? `${averageMarksRecorded}%` : "No data"}
                  </div>
                </div>
                <div className="bg-warning-subtle text-warning rounded-3 p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-card-checklist fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────────────
            3. TAB CONTENT VIEWS
           ──────────────────────────────────────────────────────────────────────── */}

        {/* ── TAB 1: OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="row g-4">
            {/* Left Column: Schedule + Materials */}
            <div className="col-lg-8">
              {/* Upcoming Classes Section */}
              <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white overflow-hidden">
                <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-calendar-week-fill text-primary fs-5"></i>
                    <h5 className="fw-bold text-dark mb-0">Upcoming Class Sessions</h5>
                  </div>
                  <button
                    onClick={() => setActiveTab("classes")}
                    className="btn btn-link text-primary p-0 small fw-bold text-decoration-none"
                  >
                    View All Schedule &rarr;
                  </button>
                </div>

                <div className="card-body p-0">
                  {upcoming.length === 0 ? (
                    <div className="text-center py-5 px-3">
                      <div className="text-muted fs-1 mb-2">
                        <i className="bi bi-calendar-x"></i>
                      </div>
                      <h6 className="fw-bold text-dark">No Classes Scheduled</h6>
                      <p className="text-muted small mb-0">
                        You have no tuition sessions scheduled in the next 14 days. Enjoy your study break!
                      </p>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light text-muted small text-uppercase">
                          <tr>
                            <th className="ps-4">Subject</th>
                            <th>Grade</th>
                            <th>Date</th>
                            <th>Time</th>
                            <th className="pe-4 text-end">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {upcoming.slice(0, 5).map((sched) => (
                            <tr key={sched.schedule_id}>
                              <td className="ps-4">
                                <div className="d-flex align-items-center gap-2.5">
                                  <div
                                    className="bg-primary-subtle text-primary rounded-3 d-flex align-items-center justify-content-center"
                                    style={{ width: "36px", height: "36px" }}
                                  >
                                    <i className="bi bi-book-half"></i>
                                  </div>
                                  <div>
                                    <div className="fw-bold text-dark">{sched.subject_name}</div>
                                    <div className="text-muted small">Batch #{sched.class_id}</div>
                                  </div>
                                </div>
                              </td>
                              <td>
                                <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-2.5 py-1">
                                  {sched.grade_level}
                                </span>
                              </td>
                              <td>
                                <div className="fw-semibold text-dark">{sched.session_date}</div>
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border px-2.5 py-1">
                                  <i className="bi bi-clock me-1 text-muted"></i>
                                  {sched.start_time}
                                </span>
                              </td>
                              <td className="pe-4 text-end">
                                <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1 fw-bold">
                                  Confirmed
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

              {/* Study Materials Preview */}
              <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
                <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-folder-fill text-warning fs-5"></i>
                    <h5 className="fw-bold text-dark mb-0">Recent Course Materials</h5>
                  </div>
                  <button
                    onClick={() => setActiveTab("materials")}
                    className="btn btn-link text-primary p-0 small fw-bold text-decoration-none"
                  >
                    View All Tutes &rarr;
                  </button>
                </div>

                <div className="card-body p-4">
                  {tutes.length === 0 ? (
                    <div className="text-center py-4">
                      <i className="bi bi-folder-x fs-1 text-muted mb-2"></i>
                      <p className="text-muted small mb-0">No study materials uploaded for your classes yet.</p>
                    </div>
                  ) : (
                    <div className="row g-3">
                      {tutes.slice(0, 4).map((tute) => (
                        <div key={tute.id} className="col-md-6">
                          <div className="border rounded-3 p-3 bg-light bg-opacity-50 h-100 d-flex flex-column justify-content-between hover-shadow transition">
                            <div>
                              <div className="d-flex justify-content-between align-items-start mb-2">
                                <span className="badge bg-primary-subtle text-primary fw-bold px-2 py-1 rounded-pill small">
                                  {tute.subject_name}
                                </span>
                                <i className="bi bi-file-earmark-pdf-fill text-danger fs-4"></i>
                              </div>
                              <h6 className="fw-bold text-dark mb-1 text-truncate" title={tute.title}>
                                {tute.title}
                              </h6>
                              <div className="text-muted small mb-3">Class Batch #{tute.class_id}</div>
                            </div>
                            <a
                              href={tute.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="btn btn-sm btn-outline-primary rounded-pill w-100 fw-semibold d-flex align-items-center justify-content-center gap-1.5"
                            >
                              <i className="bi bi-download"></i> Download Tute
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right Column: QR Code Attendance Pass & Fast Info */}
            <div className="col-lg-4">
              {/* Digital Student Attendance Pass (QR Code) */}
              <div className="card border-0 shadow-sm rounded-4 overflow-hidden mb-4 bg-white">
                <div
                  className="p-4 text-white text-center position-relative"
                  style={{
                    background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4338ca 100%)",
                  }}
                >
                  <span className="badge bg-white bg-opacity-20 text-white rounded-pill px-3 py-1 small fw-bold mb-2">
                    DIGITAL ATTENDANCE PASS
                  </span>
                  <h5 className="fw-bold mb-0 text-white">{studentName}</h5>
                  <div className="text-white-50 small font-monospace mt-1">Student ID: #{studentId}</div>
                </div>

                <div className="card-body p-4 text-center">
                  {/* QR Code Container */}
                  <div className="bg-white p-3 rounded-3 shadow-sm border d-inline-block my-2">
                    {studentId ? (
                      <QRCodeSVG
                        value={JSON.stringify({
                          student_id: studentId,
                          student_name: studentName,
                          system: "TMS",
                        })}
                        size={170}
                        bgColor="#ffffff"
                        fgColor="#1e1b4b"
                        level="M"
                        includeMargin={false}
                      />
                    ) : (
                      <div className="p-4 text-muted small">QR code unavailable</div>
                    )}
                  </div>

                  <p className="text-muted small mb-3 mt-2 lh-sm">
                    Scan this code at the classroom terminal or barcode reader for instant automated attendance check-in.
                  </p>

                  <div className="d-grid gap-2">
                    <button
                      onClick={handleCopyStudentId}
                      className="btn btn-light border btn-sm fw-semibold d-flex align-items-center justify-content-center gap-1.5 rounded-pill"
                    >
                      <i className={`bi ${copiedId ? "bi-check2-all text-success" : "bi-clipboard"}`}></i>
                      {copiedId ? "ID Copied to Clipboard!" : `Copy Student ID (#${studentId})`}
                    </button>
                    <button
                      onClick={() => setShowQRModal(true)}
                      className="btn btn-outline-primary btn-sm fw-semibold rounded-pill"
                    >
                      <i className="bi bi-arrows-fullscreen me-1"></i> Fullscreen Pass
                    </button>
                  </div>
                </div>
              </div>

              {/* SAFE Box Policy Notice Card */}
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <i className="bi bi-shield-lock-fill text-primary fs-5"></i>
                  <h6 className="fw-bold text-dark mb-0">SAFE Box Risk Thresholds</h6>
                </div>
                <div className="small text-muted mb-3">
                  Our automated algorithm calculates your academic risk level dynamically based on two core parameters:
                </div>

                <div className="d-flex flex-column gap-2.5 small">
                  <div className="p-2.5 rounded-3 bg-success-subtle text-success-emphasis d-flex align-items-start gap-2">
                    <i className="bi bi-check-circle-fill text-success fs-6 mt-0.5"></i>
                    <div>
                      <strong>Safe (Green):</strong> Attendance &gt; 85% AND Average marks &ge; 50.
                    </div>
                  </div>

                  <div className="p-2.5 rounded-3 bg-warning-subtle text-warning-emphasis d-flex align-items-start gap-2">
                    <i className="bi bi-exclamation-triangle-fill text-warning fs-6 mt-0.5"></i>
                    <div>
                      <strong>Medium Risk (Yellow):</strong> Attendance 75% - 85% OR Marks dropped by &gt;15% compared to previous term.
                    </div>
                  </div>

                  <div className="p-2.5 rounded-3 bg-danger-subtle text-danger-emphasis d-flex align-items-start gap-2">
                    <i className="bi bi-x-octagon-fill text-danger fs-6 mt-0.5"></i>
                    <div>
                      <strong>High Risk (Red):</strong> Overall attendance &lt; 75% OR Average marks &lt; 40.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: CLASSES & TIMETABLE ── */}
        {activeTab === "classes" && (
          <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
            <div className="card-header bg-white border-bottom py-3 px-4 d-flex justify-content-between align-items-center">
              <div>
                <h5 className="fw-bold text-dark mb-0">My Class Timetable & Schedule</h5>
                <p className="text-muted small mb-0">Upcoming class sessions scheduled for your enrolled batches (14-day window)</p>
              </div>
              <span className="badge bg-primary rounded-pill px-3 py-2 fw-semibold">
                {upcoming.length} Active Sessions
              </span>
            </div>

            <div className="card-body p-0">
              {upcoming.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-calendar-x fs-1 text-muted mb-2"></i>
                  <h6 className="fw-bold text-dark">No Class Sessions Found</h6>
                  <p className="text-muted small mb-0">Your instructors have not scheduled upcoming sessions for the next 14 days.</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="table-light text-muted small text-uppercase">
                      <tr>
                        <th className="ps-4">Class Subject</th>
                        <th>Target Grade</th>
                        <th>Date</th>
                        <th>Session Start Time</th>
                        <th>Status</th>
                        <th className="pe-4 text-end">Attendance Check-in</th>
                      </tr>
                    </thead>
                    <tbody>
                      {upcoming.map((sched) => (
                        <tr key={sched.schedule_id}>
                          <td className="ps-4">
                            <div className="d-flex align-items-center gap-3">
                              <div
                                className="bg-primary text-white rounded-3 d-flex align-items-center justify-content-center fw-bold"
                                style={{ width: "40px", height: "40px" }}
                              >
                                {sched.subject_name.charAt(0)}
                              </div>
                              <div>
                                <div className="fw-bold text-dark">{sched.subject_name}</div>
                                <div className="text-muted small">Batch Class ID #{sched.class_id}</div>
                              </div>
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-2.5 py-1">
                              {sched.grade_level}
                            </span>
                          </td>
                          <td>
                            <div className="fw-bold text-dark">{sched.session_date}</div>
                          </td>
                          <td>
                            <div className="d-inline-flex align-items-center gap-1.5 px-2.5 py-1 rounded bg-light border text-dark fw-medium small">
                              <i className="bi bi-clock text-primary"></i>
                              {sched.start_time}
                            </div>
                          </td>
                          <td>
                            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1">
                              Scheduled
                            </span>
                          </td>
                          <td className="pe-4 text-end">
                            <button
                              onClick={() => setShowQRModal(true)}
                              className="btn btn-outline-primary btn-sm rounded-pill fw-semibold px-3"
                            >
                              <i className="bi bi-qr-code me-1"></i> Scan In
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
        )}

        {/* ── TAB 3: COURSE MATERIALS & TUTES ── */}
        {activeTab === "materials" && (
          <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden p-4">
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-4">
              <div>
                <h5 className="fw-bold text-dark mb-0">Course Materials & Downloads</h5>
                <p className="text-muted small mb-0">Access lecture slides, tutorial sheets, and revision packs uploaded by your teachers</p>
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
                    placeholder="Search materials..."
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                  />
                </div>

                <select
                  className="form-select form-select-sm bg-light fw-medium"
                  style={{ width: "160px" }}
                  value={materialSubjectFilter}
                  onChange={(e) => setMaterialSubjectFilter(e.target.value)}
                >
                  <option value="all">All Subjects</option>
                  {allSubjects.map((sub) => (
                    <option key={sub} value={sub}>
                      {sub}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {filteredMaterials.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-folder-x fs-1 text-muted mb-2"></i>
                <h6 className="fw-bold text-dark">No Matching Materials</h6>
                <p className="text-muted small mb-0">No tutorial materials match your current search and filter criteria.</p>
              </div>
            ) : (
              <div className="row g-3">
                {filteredMaterials.map((tute) => (
                  <div key={tute.id} className="col-lg-4 col-md-6">
                    <div className="card h-100 border rounded-4 p-3.5 bg-light bg-opacity-25 hover-shadow transition">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className="badge bg-primary-subtle text-primary fw-bold px-2.5 py-1 rounded-pill small">
                          {tute.subject_name}
                        </span>
                        <div className="text-danger fs-3">
                          <i className="bi bi-file-earmark-pdf-fill"></i>
                        </div>
                      </div>

                      <h6 className="fw-bold text-dark mb-1 line-clamp-2" title={tute.title}>
                        {tute.title}
                      </h6>
                      <div className="text-muted small mb-3">
                        <i className="bi bi-layers me-1"></i> Class Batch #{tute.class_id}
                        {tute.uploaded_at && (
                          <span className="ms-2">
                            • {new Date(tute.uploaded_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>

                      <div className="mt-auto pt-2 border-top">
                        <a
                          href={tute.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-primary btn-sm rounded-pill w-100 fw-semibold d-flex align-items-center justify-content-center gap-2 shadow-xs"
                        >
                          <i className="bi bi-cloud-arrow-down-fill"></i>
                          <span>Download / Open Tute</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── TAB 4: GRADEBOOK & TERM TEST MARKS ── */}
        {activeTab === "gradebook" && (
          <div className="row g-4">
            {/* Left: Input Term Test Marks Form */}
            <div className="col-lg-5">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <div className="bg-primary-subtle text-primary p-2 rounded-3">
                    <i className="bi bi-pencil-square fs-5"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold text-dark mb-0">Record Term Test Marks</h5>
                    <p className="text-muted small mb-0">Self-report your school exam marks for SAFE Box verification</p>
                  </div>
                </div>

                <hr className="my-3 text-muted opacity-25" />

                <form onSubmit={handleMarksSubmit}>
                  {/* Subject Name Input */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">
                      Subject Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Combined Mathematics"
                      value={subjectName}
                      onChange={(e) => setSubjectName(e.target.value)}
                      required
                      list="subject-suggestions"
                    />
                    <datalist id="subject-suggestions">
                      {allSubjects.map((sub) => (
                        <option key={sub} value={sub} />
                      ))}
                      <option value="Physics" />
                      <option value="Chemistry" />
                      <option value="Biology" />
                      <option value="ICT" />
                      <option value="English" />
                    </datalist>
                    <div className="form-text" style={{ fontSize: "0.72rem" }}>
                      Enter the exact school subject matching your report card.
                    </div>
                  </div>

                  {/* Term Selection */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">
                      School Term <span className="text-danger">*</span>
                    </label>
                    <div className="d-flex gap-2">
                      {["1", "2", "3"].map((term) => (
                        <button
                          key={term}
                          type="button"
                          className={`btn btn-sm flex-fill fw-bold rounded-3 ${termNumber === term ? "btn-primary shadow-xs" : "btn-outline-secondary"
                            }`}
                          onClick={() => setTermNumber(term)}
                        >
                          Term {term}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Marks Obtained */}
                  <div className="mb-4">
                    <label className="form-label small fw-bold text-secondary">
                      Marks Obtained (0 - 100) <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        step="0.5"
                        className="form-control fw-bold fs-5 text-dark"
                        placeholder="e.g. 78"
                        value={marksValue}
                        onChange={(e) => setMarksValue(e.target.value)}
                        required
                      />
                      <span className="input-group-text bg-light text-muted fw-bold">/ 100</span>
                    </div>

                    {/* Live Grade Preview */}
                    {marksValue !== "" && !isNaN(parseFloat(marksValue)) && (
                      <div className="mt-2 d-flex align-items-center gap-2">
                        <span className="small text-muted">Estimated Grade:</span>
                        <span className={`badge bg-${getGradeInfo(parseFloat(marksValue)).color} rounded-pill`}>
                          Grade {getGradeInfo(parseFloat(marksValue)).grade} — {getGradeInfo(parseFloat(marksValue)).label}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submittingMarks}
                    className="btn btn-primary w-100 rounded-pill py-2.5 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                  >
                    {submittingMarks ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                        <span>Saving Marks...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-cloud-check-fill"></i>
                        <span>Submit Term Marks</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>

            {/* Right: Marks History & Analytics */}
            <div className="col-lg-7">
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4 h-100">
                <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-3">
                  <div>
                    <h5 className="fw-bold text-dark mb-0">Academic Performance History</h5>
                    <p className="text-muted small mb-0">Verified term marks contributing to your SAFE Box rating</p>
                  </div>

                  {/* Term Filter Buttons */}
                  <div className="btn-group btn-group-sm" role="group">
                    <button
                      type="button"
                      className={`btn ${selectedTermFilter === "all" ? "btn-dark fw-bold" : "btn-outline-secondary"}`}
                      onClick={() => setSelectedTermFilter("all")}
                    >
                      All
                    </button>
                    {["1", "2", "3"].map((t) => (
                      <button
                        key={t}
                        type="button"
                        className={`btn ${selectedTermFilter === t ? "btn-dark fw-bold" : "btn-outline-secondary"}`}
                        onClick={() => setSelectedTermFilter(t)}
                      >
                        Term {t}
                      </button>
                    ))}
                  </div>
                </div>

                <hr className="my-2 text-muted opacity-25" />

                {loadingMarks ? (
                  <div className="text-center py-5">
                    <div className="spinner-border spinner-border-sm text-primary mb-2" role="status"></div>
                    <div className="text-muted small">Loading recorded marks...</div>
                  </div>
                ) : filteredMarks.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="bi bi-journal-x fs-1 text-muted mb-2"></i>
                    <h6 className="fw-bold text-dark">No Marks Recorded Yet</h6>
                    <p className="text-muted small mb-0">Use the form on the left to submit your school term test marks.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light text-muted small text-uppercase">
                        <tr>
                          <th>Subject</th>
                          <th>Term</th>
                          <th>Score</th>
                          <th>Performance Grade</th>
                          <th className="text-end">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredMarks.map((mark) => {
                          const grade = getGradeInfo(mark.marks);
                          return (
                            <tr key={mark.id}>
                              <td>
                                <div className="fw-bold text-dark">{mark.subject_name}</div>
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border px-2 py-1">
                                  Term {mark.term_number}
                                </span>
                              </td>
                              <td>
                                <span className="fw-bold fs-6">{mark.marks}</span>
                                <span className="text-muted small">/100</span>
                              </td>
                              <td>
                                <span className={`badge bg-${grade.color}-subtle text-${grade.color} fw-bold rounded-pill px-2.5 py-1`}>
                                  {grade.grade} ({grade.label})
                                </span>
                              </td>
                              <td className="text-end">
                                <span className="badge bg-success text-white rounded-pill px-2 py-1 small">
                                  <i className="bi bi-check me-0.5"></i> Saved
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ────────────────────────────────────────────────────────────────────────
          4. FULLSCREEN QR CODE DIGITAL PASS MODAL (Bootstrap Modal Structure)
         ──────────────────────────────────────────────────────────────────────── */}
      {showQRModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: "rgba(15, 23, 42, 0.75)", backdropFilter: "blur(4px)" }}
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
        >
          <div className="modal-dialog modal-dialog-centered" role="document">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div
                className="modal-header border-0 p-4 text-white position-relative"
                style={{
                  background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #4338ca 100%)",
                }}
              >
                <div>
                  <span className="badge bg-white bg-opacity-20 text-white rounded-pill px-3 py-1 small fw-bold mb-1">
                    STUDENT IDENTITY &amp; ATTENDANCE PASS
                  </span>
                  <h4 className="fw-bold mb-0 text-white">{studentName}</h4>
                  <div className="text-white-50 font-monospace small">Student ID: #{studentId}</div>
                </div>
                <button
                  type="button"
                  className="btn-close btn-close-white position-absolute top-0 end-0 m-3"
                  onClick={() => setShowQRModal(false)}
                  aria-label="Close"
                ></button>
              </div>

              <div className="modal-body p-4 text-center bg-white">
                <div className="bg-white p-3.5 rounded-4 shadow-sm border d-inline-block my-2">
                  {studentId ? (
                    <QRCodeSVG
                      value={JSON.stringify({
                        student_id: studentId,
                        student_name: studentName,
                        system: "TMS",
                      })}
                      size={230}
                      bgColor="#ffffff"
                      fgColor="#1e1b4b"
                      level="H"
                      includeMargin={false}
                    />
                  ) : null}
                </div>

                <div className="mt-3">
                  <h6 className="fw-bold text-dark mb-1">Classroom Scanner Check-in</h6>
                  <p className="text-muted small px-3 mb-3">
                    Present this code directly to your tutor or the scanner tablet at the center entrance for immediate, tamper-proof attendance recording.
                  </p>
                </div>

                <div className="d-flex justify-content-center gap-2">
                  <button
                    onClick={handleCopyStudentId}
                    className="btn btn-outline-secondary btn-sm rounded-pill px-3 fw-semibold"
                  >
                    <i className={`bi ${copiedId ? "bi-check2-all text-success" : "bi-clipboard"} me-1`}></i>
                    {copiedId ? "ID Copied" : "Copy Student ID"}
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="btn btn-outline-dark btn-sm rounded-pill px-3 fw-semibold"
                  >
                    <i className="bi bi-printer me-1"></i> Print Pass
                  </button>
                </div>
              </div>

              <div className="modal-footer border-0 bg-light p-3 justify-content-center">
                <button
                  type="button"
                  className="btn btn-secondary btn-sm rounded-pill px-4"
                  onClick={() => setShowQRModal(false)}
                >
                  Close Pass
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
