/**
 * AdminDashboard.jsx — Professional LMS Administrator Console
 *
 * Modern Institutional Administration Console built with Bootstrap 5
 * Features:
 *  - Platform KPIs (Total Classes, Certified Teachers, Grade Levels)
 *  - Searchable Class Batch Management Roster with resolved Teacher profiles
 *  - Faculty Onboarding Module with automated temporary password generation & copy utility
 *  - Class Batch Creator with instant validation
 *  - Modern feedback toasts and accessible alerts
 */

import { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import {
  getAdminClasses,
  getAdminTeachers,
  createClass,
  registerTeacher,
} from "../api";

export default function AdminDashboard() {
  const navigate = useNavigate();

  // ── State ─────────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("overview"); // "overview" | "register-teacher" | "create-class"
  const [classes, setClasses] = useState([]);
  const [teachers, setTeachers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Search in Overview
  const [classSearch, setClassSearch] = useState("");

  // Register Teacher State
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regSuccessPass, setRegSuccessPass] = useState(null);
  const [regLoading, setRegLoading] = useState(false);
  const [copiedPass, setCopiedPass] = useState(false);

  // Create Class State
  const [selectedTeacherId, setSelectedTeacherId] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [classLoading, setClassLoading] = useState(false);

  // Floating Toast Alert
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (type, text) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage((prev) => (prev?.text === text ? null : prev));
    }, 4500);
  };

  // ── Fetch Platform Data ───────────────────────────────────────────────────
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [classRes, teacherRes] = await Promise.all([
        getAdminClasses(),
        getAdminTeachers(),
      ]);
      setClasses(classRes.data || []);
      setTeachers(teacherRes.data || []);
    } catch (err) {
      if (err.response?.status === 401) {
        localStorage.clear();
        navigate("/login");
      } else {
        setError("Failed to load administration data. Please refresh.");
      }
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    let isMounted = true;
    Promise.all([getAdminClasses(), getAdminTeachers()])
      .then(([classRes, teacherRes]) => {
        if (!isMounted) return;
        setClasses(classRes.data || []);
        setTeachers(teacherRes.data || []);
        setLoading(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setLoading(false);
        if (err.response?.status === 401) {
          localStorage.clear();
          navigate("/login");
        } else {
          setError("Failed to load administration data. Please refresh.");
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

  // ── Register Teacher Handler ──────────────────────────────────────────────
  const handleRegisterTeacher = async (e) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim()) {
      showToast("warning", "Please provide teacher name and email.");
      return;
    }

    setRegLoading(true);
    const tempPassword = "Temp@" + Math.random().toString(36).slice(2, 10);
    try {
      await registerTeacher({
        email: regEmail.trim(),
        password: tempPassword,
        role: "teacher",
        full_name: regName.trim(),
      });

      setRegSuccessPass(tempPassword);
      showToast("success", `Faculty account created for ${regName.trim()}!`);
      fetchData(); // refresh teachers list
    } catch (err) {
      showToast("danger", err.response?.data?.detail || "Failed to register teacher.");
    } finally {
      setRegLoading(false);
    }
  };

  // ── Create Class Handler ──────────────────────────────────────────────────
  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!selectedTeacherId || !subjectName.trim() || !gradeLevel.trim()) {
      showToast("warning", "Please fill in all class details.");
      return;
    }

    setClassLoading(true);
    try {
      await createClass({
        teacher_id: Number(selectedTeacherId),
        subject_name: subjectName.trim(),
        grade_level: gradeLevel.trim(),
      });

      showToast("success", `Class batch for ${subjectName.trim()} created!`);
      setSelectedTeacherId("");
      setSubjectName("");
      setGradeLevel("");
      fetchData(); // refresh classes
    } catch (err) {
      showToast("danger", err.response?.data?.detail || "Failed to create class batch.");
    } finally {
      setClassLoading(false);
    }
  };

  // ── Computed Filtered Classes ─────────────────────────────────────────────
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const match =
        cls.subject_name.toLowerCase().includes(classSearch.toLowerCase()) ||
        cls.grade_level.toLowerCase().includes(classSearch.toLowerCase()) ||
        String(cls.class_id || cls.id).includes(classSearch);
      return match;
    });
  }, [classes, classSearch]);

  const teacherMap = useMemo(() => {
    const map = {};
    teachers.forEach((t) => {
      map[t.id] = t.full_name;
    });
    return map;
  }, [teachers]);

  const uniqueGrades = useMemo(() => {
    return [...new Set(classes.map((c) => c.grade_level))].length;
  }, [classes]);

  // ── Loading Screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="d-flex flex-column justify-content-center align-items-center min-vh-100 bg-light text-center py-5">
        <div className="spinner-border text-primary mb-3" style={{ width: "3.5rem", height: "3.5rem" }} role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <h4 className="fw-bold text-dark mb-1">Loading Administration Console</h4>
        <p className="text-muted small">Fetching institution rosters, certified teachers, and class batches...</p>
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
              className="bg-danger text-white rounded-3 p-2 d-flex align-items-center justify-content-center me-2 shadow-sm"
              style={{ width: "38px", height: "38px" }}
            >
              <i className="bi bi-shield-shaded fs-5"></i>
            </div>
            <div>
              <span className="navbar-brand fw-bold mb-0 text-white tracking-wide" style={{ fontSize: "1.15rem" }}>
                EduPortal LMS
              </span>
              <span className="d-none d-sm-inline-block text-secondary small ms-2 border-start ps-2 border-secondary">
                Institution Admin Console
              </span>
            </div>
          </div>

          {/* Quick Actions Right */}
          <div className="d-flex align-items-center gap-2">
            <div className="d-flex align-items-center bg-secondary bg-opacity-25 px-3 py-1 rounded-pill text-white border border-secondary border-opacity-25">
              <i className="bi bi-person-fill-gear fs-5 text-danger me-2"></i>
              <div className="text-start">
                <div className="fw-bold small lh-1 text-white">System Admin</div>
                <div className="text-muted" style={{ fontSize: "0.72rem" }}>
                  Superuser Privileges
                </div>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="btn btn-outline-danger btn-sm rounded-pill px-3 ms-1 fw-semibold d-flex align-items-center gap-1"
              title="Sign out of admin console"
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
                <span className="badge bg-danger-subtle text-danger fw-bold px-2.5 py-1 rounded-pill">
                  <i className="bi bi-shield-lock me-1"></i> Governance
                </span>
                <span className="text-muted small">
                  Academic Operations • Faculty &amp; Batch Management
                </span>
              </div>
              <h3 className="fw-extrabold text-dark mb-0 tracking-tight">
                Tuition Institution Administration
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
                  <i className="bi bi-grid-1x2-fill me-1.5"></i> All Class Batches
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link rounded-pill py-1.5 px-3 small fw-bold ${
                    activeTab === "register-teacher" ? "active bg-primary text-white shadow-sm" : "text-secondary"
                  }`}
                  onClick={() => setActiveTab("register-teacher")}
                >
                  <i className="bi bi-person-plus-fill me-1.5"></i> Onboard Faculty
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link rounded-pill py-1.5 px-3 small fw-bold ${
                    activeTab === "create-class" ? "active bg-primary text-white shadow-sm" : "text-secondary"
                  }`}
                  onClick={() => setActiveTab("create-class")}
                >
                  <i className="bi bi-plus-circle-fill me-1.5"></i> Create Class
                </button>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Main Administration Body ─────────────────────────────────────────── */}
      <div className="container-fluid px-lg-4">
        {error && (
          <div className="alert alert-danger shadow-sm border-0 rounded-3 mb-4" role="alert">
            <i className="bi bi-exclamation-diamond-fill me-2 fs-5"></i>
            {error}
          </div>
        )}

        {/* ── 1. KPI Metric Ribbon ── */}
        <div className="row g-3 mb-4">
          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase">Total Class Batches</div>
                  <h3 className="fw-bold text-dark mt-1 mb-0">{classes.length}</h3>
                  <div className="small text-muted mt-1">Active subject courses</div>
                </div>
                <div className="bg-primary-subtle text-primary rounded-3 p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-mortarboard-fill fs-3"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase">Certified Faculty</div>
                  <h3 className="fw-bold text-success mt-1 mb-0">{teachers.length}</h3>
                  <div className="small text-muted mt-1">Registered instructors</div>
                </div>
                <div className="bg-success-subtle text-success rounded-3 p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-person-video3 fs-3"></i>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100">
              <div className="d-flex align-items-center justify-content-between">
                <div>
                  <div className="text-muted small fw-bold text-uppercase">Curriculum Grades</div>
                  <h3 className="fw-bold text-info mt-1 mb-0">{uniqueGrades}</h3>
                  <div className="small text-muted mt-1">Unique grade levels</div>
                </div>
                <div className="bg-info-subtle text-info rounded-3 p-3 d-flex align-items-center justify-content-center">
                  <i className="bi bi-layers-fill fs-3"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── TAB 1: ALL CLASS BATCHES ── */}
        {activeTab === "overview" && (
          <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden p-4">
            <div className="d-flex flex-column flex-sm-row justify-content-between align-items-sm-center gap-3 mb-4">
              <div>
                <h5 className="fw-bold text-dark mb-0">Class Batches Roster</h5>
                <p className="text-muted small mb-0">Comprehensive list of tuition classes, grade levels, and assigned teachers</p>
              </div>

              {/* Search Bar */}
              <div className="input-group input-group-sm" style={{ maxWidth: "260px" }}>
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control bg-light border-start-0"
                  placeholder="Search subject or grade..."
                  value={classSearch}
                  onChange={(e) => setClassSearch(e.target.value)}
                />
              </div>
            </div>

            {filteredClasses.length === 0 ? (
              <div className="text-center py-5">
                <i className="bi bi-mortarboard fs-1 text-muted mb-2"></i>
                <h6 className="fw-bold text-dark">No Class Batches Found</h6>
                <p className="text-muted small mb-0">Create your first class in the "Create Class" tab.</p>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light text-muted small text-uppercase">
                    <tr>
                      <th className="ps-4">Batch ID</th>
                      <th>Subject Name</th>
                      <th>Grade Level</th>
                      <th>Assigned Instructor</th>
                      <th className="pe-4 text-end">Batch Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredClasses.map((cls) => {
                      const classKey = cls.class_id ?? cls.id;
                      const teacherName = teacherMap[cls.teacher_id] || "—";
                      return (
                        <tr key={classKey}>
                          <td className="ps-4">
                            <span className="badge bg-light text-dark border font-monospace px-2.5 py-1">
                              #{classKey}
                            </span>
                          </td>
                          <td>
                            <div className="fw-bold text-dark">{cls.subject_name}</div>
                          </td>
                          <td>
                            <span className="badge bg-secondary-subtle text-secondary-emphasis rounded-pill px-2.5 py-1">
                              {cls.grade_level}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <i className="bi bi-person-badge text-primary"></i>
                              <span className="fw-semibold text-dark">{teacherName}</span>
                            </div>
                          </td>
                          <td className="pe-4 text-end">
                            <span className="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-2.5 py-1">
                              Active
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

        {/* ── TAB 2: REGISTER TEACHER ── */}
        {activeTab === "register-teacher" && (
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
            <div className="row justify-content-center">
              <div className="col-lg-6">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="bg-primary-subtle text-primary p-2 rounded-3">
                    <i className="bi bi-person-plus-fill fs-4"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold text-dark mb-0">Onboard New Faculty Member</h5>
                    <p className="text-muted small mb-0">Register a certified tutor account with an auto-generated temporary password</p>
                  </div>
                </div>

                <form onSubmit={handleRegisterTeacher}>
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-secondary">
                      Full Legal Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="e.g. Dr. Samantha Perera"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="form-label small fw-bold text-secondary">
                      Institutional Email Address <span className="text-danger">*</span>
                    </label>
                    <input
                      type="email"
                      className="form-control"
                      placeholder="teacher@tuitioncenter.lk"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      required
                    />
                    <div className="form-text small" style={{ fontSize: "0.72rem" }}>
                      A secure temporary password will be generated automatically upon registration.
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={regLoading}
                    className="btn btn-primary w-100 rounded-pill py-2.5 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                  >
                    {regLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm" role="status"></span>
                        <span>Registering Faculty...</span>
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person-check-fill"></i>
                        <span>Register Faculty Member</span>
                      </>
                    )}
                  </button>
                </form>

                {regSuccessPass && (
                  <div className="alert alert-success border-success-subtle rounded-4 p-4 mt-4 shadow-xs">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <i className="bi bi-check-circle-fill fs-5 text-success"></i>
                      <h6 className="fw-bold text-success mb-0">Faculty Credentials Created!</h6>
                    </div>
                    <p className="small text-muted mb-2">
                      Share these credentials with the teacher. Advise them to update their password after initial sign-in:
                    </p>
                    <div className="d-flex align-items-center gap-2 p-2 bg-white rounded-3 border">
                      <span className="font-monospace fw-bold fs-6 text-dark flex-grow-1 ps-2">
                        {regSuccessPass}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard?.writeText(regSuccessPass);
                          setCopiedPass(true);
                          setTimeout(() => setCopiedPass(false), 2000);
                        }}
                        className="btn btn-sm btn-outline-success rounded-pill fw-semibold"
                      >
                        {copiedPass ? "Copied!" : "Copy Password"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ── TAB 3: CREATE CLASS BATCH ── */}
        {activeTab === "create-class" && (
          <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
            <div className="row justify-content-center">
              <div className="col-lg-6">
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div className="bg-primary-subtle text-primary p-2 rounded-3">
                    <i className="bi bi-mortarboard-fill fs-4"></i>
                  </div>
                  <div>
                    <h5 className="fw-bold text-dark mb-0">Create New Class Batch</h5>
                    <p className="text-muted small mb-0">Establish a new subject curriculum and assign an instructor</p>
                  </div>
                </div>

                {teachers.length === 0 ? (
                  <div className="alert alert-warning small mb-0">
                    No teachers registered in the system yet. Please onboard a faculty member first in the "Onboard Faculty" tab.
                  </div>
                ) : (
                  <form onSubmit={handleCreateClass}>
                    <div className="mb-3">
                      <label className="form-label small fw-bold text-secondary">
                        Assign Instructor <span className="text-danger">*</span>
                      </label>
                      <select
                        className="form-select"
                        value={selectedTeacherId}
                        onChange={(e) => setSelectedTeacherId(e.target.value)}
                        required
                      >
                        <option value="">— Select Instructor —</option>
                        {teachers.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.full_name} (ID #{t.id})
                          </option>
                        ))}
                      </select>
                    </div>

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
                      />
                    </div>

                    <div className="mb-4">
                      <label className="form-label small fw-bold text-secondary">
                        Grade Level <span className="text-danger">*</span>
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="e.g. Grade 12 (2026 A/L)"
                        value={gradeLevel}
                        onChange={(e) => setGradeLevel(e.target.value)}
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={classLoading}
                      className="btn btn-primary w-100 rounded-pill py-2.5 fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                    >
                      {classLoading ? (
                        <>
                          <span className="spinner-border spinner-border-sm" role="status"></span>
                          <span>Creating Class Batch...</span>
                        </>
                      ) : (
                        <>
                          <i className="bi bi-plus-circle"></i>
                          <span>Establish Class Batch</span>
                        </>
                      )}
                    </button>
                  </form>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
