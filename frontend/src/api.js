/**
 * api.js — Centralized Axios client for the Tuition Management System.
 *
 * Equipped with automatic JWT authentication, 401 handling, and a
 * transparent Offline Fallback Engine that serves structured mock datasets
 * when the backend API is disconnected or unreachable.
 */

import axios from "axios";
import {
  MOCK_STUDENT_DASHBOARD,
  MOCK_STUDENT_MARKS,
  MOCK_TEACHER_DASHBOARD,
  MOCK_CLASS_STUDENTS,
  MOCK_CLASS_SCHEDULES,
  MOCK_PARENT_DASHBOARD,
  MOCK_ADMIN_CLASSES,
  MOCK_ADMIN_TEACHERS,
} from "./mockData";

// ── Base instance ──────────────────────────────────────────────────────────
const api = axios.create({
  baseURL: "http://localhost:8000",
  timeout: 5000,
});

// ── Request interceptor: attach Bearer token ───────────────────────────────
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = "Bearer " + token;
  }
  return config;
});

// ── Helper to resolve offline mock data matching API routes ───────────────
function resolveOfflineMock(url = "", method = "get", data = null) {
  const cleanUrl = url.replace(/^http:\/\/localhost:8000/, "").split("?")[0];
  const m = method.toLowerCase();

  // Student routes
  if (cleanUrl === "/student/dashboard-stats" && m === "get") {
    return { data: MOCK_STUDENT_DASHBOARD };
  }
  if (cleanUrl === "/student/term-marks" && m === "get") {
    const saved = localStorage.getItem("offline_student_marks");
    return { data: saved ? JSON.parse(saved) : MOCK_STUDENT_MARKS };
  }
  if (cleanUrl === "/student/term-marks" && m === "post") {
    let list = MOCK_STUDENT_MARKS;
    try {
      const saved = localStorage.getItem("offline_student_marks");
      if (saved) list = JSON.parse(saved);
      const parsedData = typeof data === "string" ? JSON.parse(data) : data;
      const newItem = {
        id: Date.now(),
        subject_name: parsedData.subject_name || "General Subject",
        term_number: Number(parsedData.term_number) || 1,
        marks: Number(parsedData.marks) || 0,
      };
      list = [newItem, ...list];
      localStorage.setItem("offline_student_marks", JSON.stringify(list));
    } catch {
      // fallback
    }
    return { data: { message: "Term marks recorded successfully (Offline Mode)" } };
  }
  if (cleanUrl.match(/^\/student\/\d+\/safebox/) && m === "get") {
    return { data: MOCK_STUDENT_DASHBOARD.safe_box };
  }
  if (cleanUrl === "/student/classes" && m === "get") {
    return { data: MOCK_STUDENT_DASHBOARD.upcoming_schedules };
  }
  if (cleanUrl === "/student/fees" && m === "get") {
    return { data: MOCK_PARENT_DASHBOARD.fee_payments };
  }

  // Teacher routes
  if (cleanUrl === "/teacher/dashboard-stats" && m === "get") {
    return { data: MOCK_TEACHER_DASHBOARD };
  }
  const matchStudents = cleanUrl.match(/^\/teacher\/classes\/(\d+)\/students/);
  if (matchStudents && m === "get") {
    const cid = matchStudents[1];
    return { data: MOCK_CLASS_STUDENTS[cid] || MOCK_CLASS_STUDENTS[1] };
  }
  const matchSchedule = cleanUrl.match(/^\/teacher\/classes\/(\d+)\/schedule/);
  if (matchSchedule) {
    if (m === "get") {
      const cid = matchSchedule[1];
      return { data: MOCK_CLASS_SCHEDULES[cid] || MOCK_CLASS_SCHEDULES[1] };
    }
    if (m === "post") {
      return { data: { message: "Schedule created successfully (Offline Mode)" } };
    }
  }
  if (cleanUrl === "/teacher/attendance" && m === "post") {
    return { data: { message: "Attendance submitted successfully (Offline Mode)" } };
  }
  if (cleanUrl.match(/^\/teacher\/classes\/\d+\/tutes/) && m === "post") {
    return { data: { message: "Study material uploaded successfully (Offline Mode)" } };
  }

  // Parent routes
  if (cleanUrl === "/parent/dashboard" && m === "get") {
    return { data: MOCK_PARENT_DASHBOARD };
  }

  // Admin routes
  if (cleanUrl === "/admin/classes" && m === "get") {
    return { data: MOCK_ADMIN_CLASSES };
  }
  if (cleanUrl === "/admin/teachers" && m === "get") {
    return { data: MOCK_ADMIN_TEACHERS };
  }
  if (cleanUrl === "/admin/classes" && m === "post") {
    return { data: { message: "Class batch created successfully (Offline Mode)" } };
  }
  if (cleanUrl === "/register" && m === "post") {
    return { data: { message: "Account created successfully (Offline Mode)" } };
  }

  return null;
}

// ── Response interceptor: handle 401 & offline network fallback ────────────
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Check for 401 Unauthorized
    if (error.response?.status === 401) {
      localStorage.clear();
      window.location.href = "/login";
      return Promise.reject(error);
    }

    // Check for network disconnection or unreachable backend
    const isNetworkError =
      !error.response ||
      error.code === "ERR_NETWORK" ||
      error.code === "ECONNABORTED" ||
      error.code === "ECONNREFUSED" ||
      error.message === "Network Error" ||
      (error.response?.status >= 500 && error.response?.status !== 501);

    if (isNetworkError && error.config) {
      const mockResult = resolveOfflineMock(
        error.config.url,
        error.config.method,
        error.config.data
      );
      if (mockResult) {
        console.warn(
          `[Offline Engine] Backend unreachable at ${error.config.url}. Serving fallback mock data.`
        );
        return Promise.resolve(mockResult);
      }
    }

    return Promise.reject(error);
  }
);

export default api;

// ── Auth ───────────────────────────────────────────────────────────────────
export const registerTeacher = (payload) => api.post("/register", payload);

// ── Admin ──────────────────────────────────────────────────────────────────
export const getAdminClasses   = ()        => api.get("/admin/classes");
export const getAdminTeachers  = ()        => api.get("/admin/teachers");
export const createClass       = (payload) => api.post("/admin/classes", payload);
export const assignTeacher     = (payload) => api.post("/admin/assign-teacher", payload);

// ── Teacher ────────────────────────────────────────────────────────────────
export const getTeacherDashboard = ()           => api.get("/teacher/dashboard-stats");
export const getClassStudents    = (classId)    => api.get(`/teacher/classes/${classId}/students`);
export const getClassSchedule    = (classId)    => api.get(`/teacher/classes/${classId}/schedule`);
export const addClassSchedule    = (classId, p) => api.post(`/teacher/classes/${classId}/schedule`, p);
export const submitAttendance    = (payload)    => api.post("/teacher/attendance", payload);
export const uploadTute          = (classId, p) => api.post(`/teacher/classes/${classId}/tutes`, p);

// ── Student ────────────────────────────────────────────────────────────────
export const getStudentDashboard  = ()           => api.get("/student/dashboard-stats");
export const getStudentSafeBox    = (studentId)  => api.get(`/student/${studentId}/safebox`);
export const getStudentClasses    = ()           => api.get("/student/classes");
export const getStudentAttendance = ()           => api.get("/student/attendance");
export const getStudentMarks      = ()           => api.get("/student/term-marks");
export const getStudentFees       = ()           => api.get("/student/fees");
export const submitTermMarks      = (payload)    => api.post("/student/term-marks", payload);

// ── Parent ─────────────────────────────────────────────────────────────────
export const getParentDashboard   = ()           => api.get("/parent/dashboard");
