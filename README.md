# 🎓 Smart Tuition Management System (LMS)

A modern, full-stack Learning Management & Tuition Institute Management System built with **React 19**, **Vite**, **Bootstrap 5**, and a **FastAPI (Python)** backend with SQLite.

The platform provides dedicated, role-based portals for **Students**, **Teachers**, **Parents**, and **Administrators**, featuring real-time academic risk monitoring (**SAFE Box**), QR-code-based attendance tracking, material uploads, term marks tracking, and tuition fee billing.

---

## 🚀 Key Features

### 1. 🛡️ SAFE Box Academic Risk Surveillance
- Automated academic risk scoring categorizing students into **Safe (Green)**, **Medium Risk (Yellow)**, or **High Risk (Red)**.
- Monitors attendance thresholds (<75%), consecutive absences, and exam mark drop-offs (>15%) to trigger early interventions.
- Visible to instructors, students, and linked parents in real-time.

### 2. 📱 QR Code Attendance Terminal
- Students get a unique, color-coded **QR Attendance Identity Pass** generated on their dashboard (`qrcode.react`).
- Teachers have an interactive **Attendance Terminal / Scanner** supporting hardware barcode/QR scanners (Bluetooth/USB) and instant one-touch manual overrides.

### 3. 👥 Multi-Role Portals
- **Student Dashboard:** View upcoming class schedule, download study materials (tutes), record term exam scores, inspect SAFE Box standing, and view fee receipts.
- **Teacher Dashboard:** Instructor KPI ribbon, At-Risk Student surveillance table with search/filters, class session scheduler, and course material uploader.
- **Parent Portal:** Real-time oversight of linked child's attendance percentage, SAFE Box warnings, exam report card with letter grades, and tuition fee ledger (in LKR) with Paid vs. Pending indicators.
- **Administrator Console:** Institutional metrics, certified faculty directory, class batch management, faculty onboarding with temporary password generation.

### 4. ⚡ Offline Demo Engine (Zero-Backend Preview)
- Built-in intelligent offline fallback interceptor in Axios (`src/api.js`).
- If the FastAPI backend is disconnected or not yet started, the entire UI seamlessly operates in **Offline Demo Mode** with comprehensive, structured mock data so presentations and UI evaluations never crash.

---

## 📂 Project Architecture

```text
tuition-management-system/
├── package.json              # Monorepo root workspace scripts (dev, build, lint)
├── README.md                 # Project documentation & setup instructions
├── backend/                  # FastAPI Backend API
│   ├── main.py               # FastAPI entry point & CORS configuration
│   ├── auth.py               # JWT authentication & password hashing
│   ├── database.py           # SQLAlchemy SQLite engine & session maker
│   ├── models.py             # Database models (User, Student, Teacher, Parent, ClassBatch, etc.)
│   ├── schemas.py            # Pydantic request/response schemas
│   ├── safebox.py            # SAFE Box risk calculation logic
│   ├── tuition.db            # SQLite database
│   ├── routers/              # API route controllers (admin, teacher, student, parent)
│   └── venv/                 # Python virtual environment
└── frontend/                 # React 19 + Vite Frontend SPA
    ├── package.json          # Frontend dependencies & scripts
    ├── vite.config.js        # Vite config with '@' alias & port 5173
    ├── index.html            # HTML entry point with Bootstrap Icons & Plus Jakarta Sans
    └── src/
        ├── main.jsx          # React DOM entry point
        ├── App.jsx           # React Router v7 & ProtectedRoute role access control
        ├── api.js            # Axios client with JWT interceptor & Offline Fallback Engine
        ├── mockData.js       # Structured mock datasets for offline preview
        ├── index.css         # Global modern LMS styling variables
        ├── hooks/
        │   └── useToast.js   # Fast-refresh-safe toast notification hook
        ├── components/
        │   ├── AttendanceScanner.jsx  # QR/Barcode hardware scanner & manual roster
        │   ├── Spinner.jsx            # Modern loading spinners
        │   └── Toast.jsx              # Accessible floating alert toasts
        ├── pages/
        │   ├── Login.jsx              # Split-screen institutional portal with 1-click demo login
        │   ├── StudentDashboard.jsx   # Student LMS dashboard
        │   ├── TeacherDashboard.jsx   # Teacher / Instructor dashboard
        │   ├── ParentDashboard.jsx    # Parent & Guardian portal
        │   └── AdminDashboard.jsx     # Administrator console
        └── styles/
            └── dashboard.css          # Shared dashboard styling utilities
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Node.js** (v18 or higher) & **npm**
- **Python** (3.10+ recommended)

---

### Running the Frontend (UI)

From the project root directory:

```bash
# 1. Install frontend dependencies (if not already installed)
cd frontend
npm install
cd ..

# 2. Run dev server (from root or from frontend/)
npm run dev
```

The application will be accessible at: **`http://localhost:5173/`**

> **Tip:** You can run `npm run dev`, `npm run build`, and `npm run lint` directly from the project root!

---

### Running the Backend (FastAPI)

In a separate terminal window:

```bash
cd backend

# Activate Python virtual environment (Windows PowerShell)
.\venv\Scripts\Activate.ps1

# Run the FastAPI server via Uvicorn
uvicorn main:app --reload --port 8000
```

The backend API will run at **`http://localhost:8000`** (Swagger docs available at **`http://localhost:8000/docs`**).

---

## 🔑 Pre-Configured Demo Accounts

For instant testing and evaluation, click any of the **1-Click Demo Login** pills on the login screen or use these credentials:

| Role | Email Address | Password | Landing Page |
| :--- | :--- | :--- | :--- |
| **Student** | `student@test.com` | `password123` | `/student-dashboard` |
| **Teacher** | `teacher@test.com` | `password123` | `/teacher-dashboard` |
| **Parent** | `parent@test.com` | `password123` | `/parent-dashboard` |
| **Admin** | `admin@test.com` | `password123` | `/admin-dashboard` |

*(Note: Even when the backend server is offline, entering these credentials logs you into the respective dashboard via the Offline Demo Engine).*

---

## 🛠️ Verification & Build Commands

All lint checks and production builds are guaranteed to pass with **0 errors and 0 warnings**:

```bash
# Run ESLint across all frontend source files
npm run lint

# Build production bundle with Vite
npm run build

# Preview production build locally
npm run preview
```

---

## 📋 Resolved Build & Architecture Notes

- **Resolved `Failed to load url /src/main.jsx`:** Configured relative script paths in `frontend/index.html` (`./src/main.jsx`) and added root monorepo scripts so running commands from either the repository root or the `frontend` folder executes cleanly.
- **Removed Dead Code:** Cleaned up stray npm artifacts in `backend/` and removed unused template CSS (`App.css`).
- **React 19 & Fast Refresh Compliance:** Refactored `useToast` to `src/hooks/useToast.js`, eliminated synchronous effect state setters (`set-state-in-effect`), and stabilized memoization dependencies.
