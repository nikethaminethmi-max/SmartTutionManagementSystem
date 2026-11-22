/**
 * ParentDashboard.jsx — Professional LMS Parent & Guardian Portal
 *
 * Modern LMS Guardian Dashboard built with Bootstrap 5
 * Features:
 *  - Linked child academic monitoring badge & profile card
 *  - Prominent SAFE Box Academic Risk Monitor (Green/Yellow/Red status indicator)
 *  - Attendance analytics breakdown (Total sessions, Present, Absent, Attendance %)
 *  - Term test marks progression chart & detailed subject report card with letter grades
 *  - Tuition fee payment ledger (LKR currency) with Paid vs Pending indicators
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { getParentDashboard } from "../api";

export default function ParentDashboard() {
  const navigate = useNavigate();

  // ── State ─────────────────────────────────────────────────────────────────
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "attendance" | "marks" | "fees"

  // ── Fetch Dashboard ───────────────────────────────────────────────────────
  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getParentDashboard();
      setData(res.data);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
      } else {
        setError(err.response?.data?.detail || "Failed to load parent dashboard. Please refresh.");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;
    getParentDashboard()
      .then((res) => {
        if (!isMounted) return;
        setData(res.data);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoading(false);
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/login");
        } else {
          setError(err.response?.data?.detail || "Failed to load parent dashboard. Please refresh.");
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

  // Helper for letter grades
  const getGradeInfo = (marks) => {
    if (marks == null || isNaN(marks)) return { grade: "—", label: "N/A", color: "secondary" };
    if (marks >= 75) return { grade: "A", label: "Distinction", color: "success" };
    if (marks >= 65) return { grade: "B", label: "Very Good", color: "primary" };
    if (marks >= 50) return { grade: "C", label: "Credit", color: "info" };
    if (marks >= 35) return { grade: "S", label: "Ordinary Pass", color: "warning" };
    return { grade: "F", label: "Needs Support", color: "danger" };
  };

  // ── SAFE Box visual theme ─────────────────────────────────────────────────
  const safeBoxTheme = useMemo(() => {
    const status = data?.safe_box?.status || "Safe";
    if (status === "High Risk") {
      return {
        cardClass: "border-danger bg-danger-subtle text-danger-emphasis",
        badgeClass: "bg-danger text-white",
        icon: "bi-shield-fill-x",
        accent: "danger",
        title: "High Risk — Immediate Action Recommended",
        summaryText: "Your child's attendance is below 75% or term marks average is below 40. Please schedule a consultation with the tutors.",
      };
    }
    if (status === "Medium Risk") {
      return {
        cardClass: "border-warning bg-warning-subtle text-warning-emphasis",
        badgeClass: "bg-warning text-dark",
        icon: "bi-shield-fill-exclamation",
        accent: "warning",
        title: "Medium Risk — Attention Recommended",
        summaryText: "Attendance is in the caution zone (75% - 85%) or recent exam marks dropped by > 15%. Focus on revision and class regularity.",
      };
    }
    return {
      cardClass: "border-success bg-success-subtle text-success-emphasis",
      badgeClass: "bg-success text-white",
      icon: "bi-shield-fill-check",
      accent: "success",
      title: "Safe Status — Meeting Academic Benchmarks",
      summaryText: "Excellent academic standing! Your child is maintaining high class attendance (>85%) and consistent examination marks (≥50).",
    };
  }, [data]);

  // Fee calculation summaries
  const feeSummary = useMemo(() => {
    const payments = data?.fee_payments || [];
    let paid = 0;
    let pending = 0;
    payments.forEach((p) => {
      if (p.status === "Paid") paid += p.amount;
      else pending += p.amount;
    });
    return { paid, pending };
  }, [data]);

  // Unique terms and subjects for marks
  const termMarksData = useMemo(() => {
    const marks = data?.term_marks || [];
    const terms = [...new Set(marks.map((m) => m.term_number))].sort();
    const subjects = [...new Set(marks.map((m) => m.subject_name))].sort();
    return { terms, subjects, all: marks };
  }, [data]);

  // ── Loading Screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-light text-center py-5">
        <div className="spinner-border text-primary mb-3" style={{ width: "3.5rem", height: "3.5rem" }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h4 className="fw-bold text-dark mb-1">Loading Parent Portal</h4>
        <p className="text-muted small">Accessing linked student SAFE Box metrics and fee invoices...</p>
      </div>
    );
  }

  const child = data?.child;
  const safeBox = data?.safe_box;
  const attendance = data?.attendance_summary;
  const parentName = data?.parent_name || "Parent";

  return (
    <div className="bg-light min-vh-100 pb-5" style={{ fontFamily: "'Plus Jakarta Sans', system-ui, sans-serif" }}>
      {/* ── Modern LMS Navigation Bar ─────────────────────────────────────────── */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark sticky-top shadow-sm py-2">
        <div className="container-fluid px-lg-4">
          {/* Brand */}
          <div className="d-flex align-items-center">
            <div
              className="bg-warning text-dark rounded-3 p-2 d-flex align-items-center justify-content-center me-2 shadow-sm fw-bold"
              style={{ width: "38px", height: "38px" }}
            >
              <i className="bi bi-people-fill fs-5"></i>
            </div>
            <div>
              <span className="navbar-brand fw-bold mb-0 text-white tracking-wide" style={{ fontSize: "1.15rem" }}>
                EduPortal LMS
              </span>
              <span className="d-none d-sm-inline-block text-secondary small ms-2 border-start ps-2 border-secondary">
                Parent &amp; Guardian Portal
              </span>
            </div>
          </div>

          {/* Quick Actions Right */}
          <div className="d-flex align-items-center gap-2">
            {/* Parent Profile Chip */}
            <div className="d-flex align-items-center bg-secondary bg-opacity-25 px-3 py-1 rounded-pill text-white border border-secondary border-opacity-25">
              <i className="bi bi-person-heart fs-5 text-warning me-2"></i>
              <div className="text-start">
                <div className="fw-bold small lh-1 text-white">{parentName}</div>
                <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                  Guardian of {child?.student_name || "Student"}
                </div>
              </div>
            </div>

            {/* Refresh */}
            <button
              onClick={fetchDashboard}
              className="btn btn-outline-light btn-sm rounded-pill px-3 ms-1 fw-semibold d-flex align-items-center gap-1"
              title="Refresh parent metrics"
            >
              <i className="bi bi-arrow-clockwise"></i>
              <span className="d-none d-sm-inline">Refresh</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className="btn btn-outline-danger btn-sm rounded-pill px-3 ms-1 fw-semibold d-flex align-items-center gap-1"
              title="Sign out of parent portal"
            >
              <i className="bi bi-box-arrow-right"></i>
              <span className="d-none d-sm-inline">Logout</span>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Sub-Header & Child Banner ─────────────────────────────────────────── */}
      <div className="bg-white border-bottom py-3 shadow-xs mb-4">
        <div className="container-fluid px-lg-4">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
            <div>
              <div className="d-flex align-items-center gap-2 mb-1">
                <span className="badge bg-warning-subtle text-warning-emphasis fw-bold px-2.5 py-1 rounded-pill">
                  <i className="bi bi-heart-fill text-danger me-1"></i> Family Oversight
                </span>
                <span className="text-muted small">
                  Academic Monitoring • Real-Time Institution Link
                </span>
              </div>
              <h3 className="fw-extrabold text-dark mb-0 tracking-tight">
                Monitoring: {child?.student_name || "Your Child"}
                {child?.grade && (
                  <span className="badge bg-light text-dark border ms-2 fw-semibold fs-6">
                    {child.grade}
                  </span>
                )}
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
                    activeTab === "attendance" ? "active bg-primary text-white shadow-sm" : "text-secondary"
                  }`}
                  onClick={() => setActiveTab("attendance")}
                >
                  <i className="bi bi-calendar-check me-1.5"></i> Attendance
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link rounded-pill py-1.5 px-3 small fw-bold ${
                    activeTab === "marks" ? "active bg-primary text-white shadow-sm" : "text-secondary"
                  }`}
                  onClick={() => setActiveTab("marks")}
                >
                  <i className="bi bi-graph-up me-1.5"></i> Term Marks
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link rounded-pill py-1.5 px-3 small fw-bold ${
                    activeTab === "fees" ? "active bg-primary text-white shadow-sm" : "text-secondary"
                  }`}
                  onClick={() => setActiveTab("fees")}
                >
                  <i className="bi bi-credit-card me-1.5"></i> Fee Payments
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

        {/* ── 1. PROMINENT SAFE BOX ACADEMIC MONITOR ── */}
        <div className={`card border-2 shadow-sm rounded-4 mb-4 overflow-hidden ${safeBoxTheme.cardClass}`}>
          <div className="card-body p-4">
            <div className="row align-items-center g-4">
              <div className="col-lg-7">
                <div className="d-flex align-items-center gap-3 mb-2">
                  <div
                    className="rounded-circle d-flex align-items-center justify-content-center bg-white shadow-sm"
                    style={{ width: "54px", height: "54px", minWidth: "54px" }}
                  >
                    <i className={`bi ${safeBoxTheme.icon} fs-2 text-${safeBoxTheme.accent}`}></i>
                  </div>
                  <div>
                    <div className="d-flex align-items-center gap-2">
                      <span className={`badge ${safeBoxTheme.badgeClass} rounded-pill px-3 py-1.5 text-uppercase fw-bold tracking-wider small`}>
                        SAFE Box: {safeBox?.status || "Safe"}
                      </span>
                      <span className="text-muted small">Child Risk Evaluation</span>
                    </div>
                    <h4 className="fw-extrabold mb-0 mt-1">{safeBoxTheme.title}</h4>
                  </div>
                </div>

                <p className="mb-3 opacity-90 small lh-base">
                  {safeBoxTheme.summaryText}
                </p>

                {safeBox?.reasons && safeBox.reasons.length > 0 && (
                  <div className="bg-white bg-opacity-75 p-3 rounded-3 border border-opacity-25 small mb-0">
                    <div className="fw-bold mb-1 text-dark d-flex align-items-center gap-1.5">
                      <i className="bi bi-info-circle-fill text-primary"></i> Identified Risk Indicators:
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

              {/* Quick Metrics */}
              <div className="col-lg-5">
                <div className="row g-3">
                  <div className="col-6">
                    <div className="card border-0 bg-white shadow-xs rounded-3 p-3 text-center h-100">
                      <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.72rem" }}>
                        Attendance Rate
                      </div>
                      <div className="my-2">
                        <span className={`display-6 fw-extrabold text-${safeBoxTheme.accent}`}>
                          {safeBox?.overall_attendance_pct != null
                            ? `${safeBox.overall_attendance_pct.toFixed(1)}%`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="progress" style={{ height: "6px" }}>
                        <div
                          className={`progress-bar bg-${safeBoxTheme.accent}`}
                          style={{ width: `${Math.min(safeBox?.overall_attendance_pct || 0, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div className="col-6">
                    <div className="card border-0 bg-white shadow-xs rounded-3 p-3 text-center h-100">
                      <div className="text-muted text-uppercase fw-bold" style={{ fontSize: "0.72rem" }}>
                        Term Mark Average
                      </div>
                      <div className="my-2">
                        <span className="display-6 fw-extrabold text-dark">
                          {safeBox?.avg_term_marks != null ? safeBox.avg_term_marks.toFixed(1) : "—"}
                        </span>
                        <span className="text-muted small">/100</span>
                      </div>
                      <span className={`badge bg-${getGradeInfo(safeBox?.avg_term_marks).color}-subtle text-${getGradeInfo(safeBox?.avg_term_marks).color} rounded-pill px-2.5 py-1 fw-bold small`}>
                        Grade {getGradeInfo(safeBox?.avg_term_marks).grade}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── 2. KPI RIBBON ── */}
        <div className="row g-3 mb-4">
          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase">Total Class Sessions</div>
                  <h3 className="fw-bold text-dark mt-1 mb-0">{attendance?.total_sessions ?? 0}</h3>
                  <div className="small text-muted mt-1">Conducted by teachers</div>
                </div>
                <div className="bg-primary-subtle text-primary rounded-3 p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-calendar-event-fill fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase">Sessions Attended</div>
                  <h3 className="fw-bold text-success mt-1 mb-0">{attendance?.present_count ?? 0}</h3>
                  <div className="small text-muted mt-1">{attendance?.absent_count ?? 0} absences logged</div>
                </div>
                <div className="bg-success-subtle text-success rounded-3 p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-check2-circle fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase">Tuition Fees Paid</div>
                  <h4 className="fw-bold text-success mt-1 mb-0">
                    LKR {feeSummary.paid.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                  </h4>
                  <div className="small text-muted mt-1">Verified receipts</div>
                </div>
                <div className="bg-info-subtle text-info rounded-3 p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-cash-coin fs-4"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-3 col-sm-6">
            <div className="card border-0 shadow-sm rounded-4 h-100 p-3 bg-white">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase">Pending Tuition Fees</div>
                  <h4 className={`fw-bold mt-1 mb-0 ${feeSummary.pending > 0 ? "text-danger" : "text-success"}`}>
                    LKR {feeSummary.pending.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                  </h4>
                  <div className="small text-muted mt-1">
                    {feeSummary.pending > 0 ? "Payment due" : "All cleared"}
                  </div>
                </div>
                <div className={`${feeSummary.pending > 0 ? "bg-danger-subtle text-danger" : "bg-success-subtle text-success"} rounded-3 p-3 d-flex align-items-center justify-content-center`}>
                  <i className="bi bi-credit-card-2-front-fill fs-4"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── TAB 1: OVERVIEW ── */}
        {activeTab === "overview" && (
          <div className="row g-4">
            {/* Left Column: Attendance Overview & Term Marks Preview */}
            <div className="col-lg-7">
              {/* Attendance Progress Card */}
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-pie-chart-fill text-primary fs-5"></i>
                    <h5 className="fw-bold text-dark mb-0">Attendance Regularity Breakdown</h5>
                  </div>
                  <span className="badge bg-primary-subtle text-primary fw-bold rounded-pill px-3 py-1.5">
                    {attendance?.attendance_pct != null ? `${attendance.attendance_pct.toFixed(1)}%` : "N/A"}
                  </span>
                </div>

                <div className="row align-items-center g-3">
                  <div className="col-sm-5 text-center">
                    <div className="display-4 fw-extrabold text-primary mb-1">
                      {attendance?.attendance_pct != null ? `${attendance.attendance_pct.toFixed(0)}%` : "0%"}
                    </div>
                    <div className="text-muted small fw-semibold">Attendance Rate</div>
                  </div>
                  <div className="col-sm-7">
                    <div className="d-flex flex-column gap-2 small">
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Total Sessions Held:</span>
                        <strong className="text-dark">{attendance?.total_sessions ?? 0}</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Present (Attended):</span>
                        <strong className="text-success">{attendance?.present_count ?? 0} sessions</strong>
                      </div>
                      <div className="d-flex justify-content-between">
                        <span className="text-muted">Absent (Missed):</span>
                        <strong className="text-danger">{attendance?.absent_count ?? 0} sessions</strong>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Term Marks Report Card */}
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-award-fill text-warning fs-5"></i>
                    <h5 className="fw-bold text-dark mb-0">Examination Performance Report</h5>
                  </div>
                  <button
                    onClick={() => setActiveTab("marks")}
                    className="btn btn-link text-primary p-0 small fw-bold text-decoration-none"
                  >
                    View Full Gradebook &rarr;
                  </button>
                </div>

                {termMarksData.all.length === 0 ? (
                  <div className="text-center py-4">
                    <i className="bi bi-journal-x fs-1 text-muted mb-2"></i>
                    <p className="text-muted small mb-0">No exam marks submitted for this student yet.</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light text-muted small text-uppercase">
                        <tr>
                          <th>Subject</th>
                          <th>Term</th>
                          <th>Score</th>
                          <th className="text-end">Grade</th>
                        </tr>
                      </thead>
                      <tbody>
                        {termMarksData.all.slice(0, 5).map((m, i) => {
                          const g = getGradeInfo(m.marks);
                          return (
                            <tr key={i}>
                              <td>
                                <span className="fw-bold text-dark">{m.subject_name}</span>
                              </td>
                              <td>
                                <span className="badge bg-light text-dark border px-2.5 py-1">
                                  Term {m.term_number}
                                </span>
                              </td>
                              <td>
                                <span className="fw-bold fs-6">{m.marks}</span>
                                <span className="text-muted small">/100</span>
                              </td>
                              <td className="text-end">
                                <span className={`badge bg-${g.color}-subtle text-${g.color} rounded-pill px-2.5 py-1 fw-bold`}>
                                  {g.grade} ({g.label})
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

            {/* Right Column: Fee Status & Helpdesk */}
            <div className="col-lg-5">
              {/* Fee Ledger Summary */}
              <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-wallet2 text-success fs-5"></i>
                    <h5 className="fw-bold text-dark mb-0">Monthly Fee Status</h5>
                  </div>
                  <button
                    onClick={() => setActiveTab("fees")}
                    className="btn btn-link text-primary p-0 small fw-bold text-decoration-none"
                  >
                    View Invoices &rarr;
                  </button>
                </div>

                {data?.fee_payments?.length === 0 ? (
                  <div className="text-center py-3">
                    <p className="text-muted small mb-0">No fee payment history on record.</p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-2.5">
                    {data.fee_payments.slice(0, 4).map((p) => {
                      const isPaid = p.status === "Paid";
                      return (
                        <div
                          key={p.id}
                          className="d-flex justify-content-between align-items-center p-3 rounded-3 border bg-light bg-opacity-50"
                        >
                          <div>
                            <div className="fw-bold text-dark">{p.month}</div>
                            <div className="text-muted small font-monospace">{p.formatted_amount}</div>
                          </div>
                          <span className={`badge ${isPaid ? "bg-success" : "bg-danger"} rounded-pill px-3 py-1.5 fw-semibold`}>
                            {isPaid ? "✓ Paid" : "⏳ Pending"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Institution Helpdesk & Contact */}
              <div className="card border-0 shadow-sm rounded-4 p-4 bg-white">
                <div className="d-flex align-items-center gap-2 mb-2">
                  <i className="bi bi-headset text-primary fs-5"></i>
                  <h6 className="fw-bold text-dark mb-0">Parent Support &amp; Enquiries</h6>
                </div>
                <p className="small text-muted mb-3">
                  Have questions about your child's SAFE Box risk calculation, class schedules, or fee receipts?
                </p>
                <div className="p-3 bg-light rounded-3 small">
                  <div className="fw-bold text-dark mb-1">
                    <i className="bi bi-telephone-fill text-primary me-1"></i> Tuition Office: +94 11 234 5678
                  </div>
                  <div className="text-muted">
                    <i className="bi bi-envelope-fill text-primary me-1"></i> support@edulms.lk
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 2: DETAILED ATTENDANCE ── */}
        {activeTab === "attendance" && (
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
            <h5 className="fw-bold text-dark mb-1">Attendance Regularity &amp; History</h5>
            <p className="text-muted small mb-4">Detailed records of class attendance influencing the SAFE Box indicator</p>

            <div className="row g-4 align-items-center">
              <div className="col-lg-4 text-center">
                <div
                  className="rounded-circle d-inline-flex flex-column align-items-center justify-content-center border border-4 border-primary p-4 shadow-sm"
                  style={{ width: "180px", height: "180px" }}
                >
                  <span className="display-5 fw-extrabold text-primary">
                    {attendance?.attendance_pct != null ? `${attendance.attendance_pct.toFixed(0)}%` : "0%"}
                  </span>
                  <span className="text-muted small fw-bold text-uppercase">Overall Rate</span>
                </div>
              </div>

              <div className="col-lg-8">
                <div className="row g-3">
                  <div className="col-sm-4">
                    <div className="card border bg-light p-3 rounded-3 text-center">
                      <div className="text-muted small fw-bold">Total Sessions</div>
                      <h3 className="fw-bold text-dark mt-1 mb-0">{attendance?.total_sessions ?? 0}</h3>
                    </div>
                  </div>
                  <div className="col-sm-4">
                    <div className="card border bg-success-subtle border-success-subtle p-3 rounded-3 text-center">
                      <div className="text-success small fw-bold">Sessions Present</div>
                      <h3 className="fw-bold text-success mt-1 mb-0">{attendance?.present_count ?? 0}</h3>
                    </div>
                  </div>
                  <div className="col-sm-4">
                    <div className="card border bg-danger-subtle border-danger-subtle p-3 rounded-3 text-center">
                      <div className="text-danger small fw-bold">Sessions Absent</div>
                      <h3 className="fw-bold text-danger mt-1 mb-0">{attendance?.absent_count ?? 0}</h3>
                    </div>
                  </div>
                </div>

                <div className="alert alert-info mt-3 small mb-0">
                  <i className="bi bi-info-circle-fill me-1"></i>
                  <strong>Attendance Benchmark Policy:</strong> Students maintaining greater than 85% attendance qualify
                  for Safe status. Falling below 75% triggers an immediate High Risk SAFE Box alert.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: TERM TEST MARKS & PROGRESSION ── */}
        {activeTab === "marks" && (
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
            <h5 className="fw-bold text-dark mb-1">Academic Performance &amp; Term Test Marks</h5>
            <p className="text-muted small mb-4">Official school term test records across all enrolled subjects</p>

            {termMarksData.all.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-journal-x fs-1 text-muted mb-2"></i>
                <h6 className="fw-bold text-dark">No Marks Recorded</h6>
                <p className="text-muted small mb-0">Your child has not yet submitted school term test marks.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light text-muted small text-uppercase">
                    <tr>
                      <th className="ps-4">Subject</th>
                      <th>Term</th>
                      <th>Marks Obtained</th>
                      <th>Academic Grade</th>
                      <th className="pe-4 text-end">SAFE Benchmark Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {termMarksData.all.map((m, idx) => {
                      const g = getGradeInfo(m.marks);
                      const isPassing = m.marks >= 50;
                      return (
                        <tr key={idx}>
                          <td className="ps-4">
                            <span className="fw-bold text-dark">{m.subject_name}</span>
                          </td>
                          <td>
                            <span className="badge bg-light text-dark border px-2.5 py-1">
                              Term {m.term_number}
                            </span>
                          </td>
                          <td>
                            <span className="fw-bold fs-6">{m.marks}</span>
                            <span className="text-muted small"> / 100</span>
                          </td>
                          <td>
                            <span className={`badge bg-${g.color}-subtle text-${g.color} rounded-pill px-2.5 py-1 fw-bold`}>
                              {g.grade} — {g.label}
                            </span>
                          </td>
                          <td className="pe-4 text-end">
                            <span className={`badge ${isPassing ? "bg-success" : "bg-danger"} rounded-pill px-2.5 py-1`}>
                              {isPassing ? "✓ Meets Safe Criteria (≥50)" : "⚠️ Below Safe Target (<50)"}
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
        )}

        {/* ── TAB 4: FEE PAYMENTS (LKR) ── */}
        {activeTab === "fees" && (
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-2 mb-4">
              <div>
                <h5 className="fw-bold text-dark mb-1">Monthly Tuition Fee Payments (LKR)</h5>
                <p className="text-muted small mb-0">Official payment receipts and pending dues for your child</p>
              </div>
              <div className="d-flex gap-2">
                <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-2 fw-bold">
                  Paid: LKR {feeSummary.paid.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                </span>
                {feeSummary.pending > 0 && (
                  <span className="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-3 py-2 fw-bold">
                    Due: LKR {feeSummary.pending.toLocaleString("en-LK", { minimumFractionDigits: 2 })}
                  </span>
                )}
              </div>
            </div>

            {data?.fee_payments?.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-wallet2 fs-1 text-muted mb-2"></i>
                <h6 className="fw-bold text-dark">No Fee Invoices Found</h6>
                <p className="text-muted small mb-0">No tuition payment records are logged for this account.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light text-muted small text-uppercase">
                    <tr>
                      <th className="ps-4">Invoice Month</th>
                      <th>Fee Amount (LKR)</th>
                      <th>Receipt Status</th>
                      <th>Payment Date</th>
                      <th className="pe-4 text-end">Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.fee_payments.map((p) => {
                      const isPaid = p.status === "Paid";
                      return (
                        <tr key={p.id}>
                          <td className="ps-4">
                            <span className="fw-bold text-dark">{p.month}</span>
                            <span className="text-muted small ms-2">Invoice #{p.id}</span>
                          </td>
                          <td>
                            <span className="fw-bold fs-6 font-monospace">{p.formatted_amount}</span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                isPaid
                                  ? "bg-success-subtle text-success border border-success-subtle"
                                  : "bg-danger-subtle text-danger border border-danger-subtle"
                              } rounded-pill px-3 py-1.5 fw-bold`}
                            >
                              <i className={`bi ${isPaid ? "bi-check-circle-fill" : "bi-clock-fill"} me-1`}></i>
                              {p.status}
                            </span>
                          </td>
                          <td>
                            <span className="text-dark fw-medium small">
                              {p.payment_date || "—"}
                            </span>
                          </td>
                          <td className="pe-4 text-end">
                            <span className="badge bg-light text-muted border px-2.5 py-1 small">
                              Official LKR Receipt
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
        )}
      </div>
    </div>
  );
}
