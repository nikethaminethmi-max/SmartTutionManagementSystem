import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Login           from "./pages/Login";
import AdminDashboard  from "./pages/AdminDashboard";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import ParentDashboard  from "./pages/ParentDashboard";

/**
 * ProtectedRoute — redirects to /login if:
 *   • No JWT token is stored in localStorage, OR
 *   • A `requiredRole` is specified and the stored role doesn't match.
 */
function ProtectedRoute({ element, requiredRole }) {
  const token = localStorage.getItem("token");
  const role  = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;
  if (requiredRole && role !== requiredRole) return <Navigate to="/login" replace />;

  return element;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* ── Public ── */}
        <Route path="/"      element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />

        {/* ── Admin (Phase 4) ── */}
        <Route
          path="/admin-dashboard"
          element={<ProtectedRoute element={<AdminDashboard />} requiredRole="admin" />}
        />

        {/* ── Teacher (Phase 4) ── */}
        <Route
          path="/teacher-dashboard"
          element={<ProtectedRoute element={<TeacherDashboard />} requiredRole="teacher" />}
        />

        {/* ── Student (Phase 5) ── */}
        <Route
          path="/student-dashboard"
          element={<ProtectedRoute element={<StudentDashboard />} requiredRole="student" />}
        />

        {/* ── Parent (Phase 5) ── */}
        <Route
          path="/parent-dashboard"
          element={<ProtectedRoute element={<ParentDashboard />} requiredRole="parent" />}
        />

        {/* ── Catch-all ── */}
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
