/**
 * mockData.js — Comprehensive Offline Mock Dataset & Storage
 *
 * Provides realistic, structured mock data conforming exactly to the FastAPI
 * schemas for Student, Teacher, Parent, and Admin dashboards when the backend is offline.
 */

export const MOCK_STUDENT_DASHBOARD = {
  student_name: "John Doe",
  student_id: 101,
  grade_level: "Grade 11 - Batch A",
  safe_box: {
    student_id: 101,
    status: "Safe",
    attendance_percentage: 92.5,
    term_marks_average: 78.4,
    consecutive_absences: 0,
    warnings: [],
  },
  upcoming_schedules: [
    {
      id: 201,
      subject_name: "Combined Mathematics",
      teacher_name: "Dr. Samantha Perera",
      date: "Tomorrow, Nov 23",
      start_time: "08:30 AM",
      room: "Lecture Hall B",
      status: "Upcoming",
    },
    {
      id: 202,
      subject_name: "Physics (Advanced Level)",
      teacher_name: "Prof. K. Wijesinghe",
      date: "Tuesday, Nov 25",
      start_time: "10:15 AM",
      room: "Physics Lab 1",
      status: "Upcoming",
    },
    {
      id: 203,
      subject_name: "Chemistry Revision Batch",
      teacher_name: "Dr. Samantha Perera",
      date: "Friday, Nov 28",
      start_time: "02:00 PM",
      room: "Seminar Room 3",
      status: "Upcoming",
    },
  ],
  downloadable_tutes: [
    {
      id: 301,
      title: "Pure Mathematics - Integration & Differential Equations Guide",
      subject_name: "Combined Mathematics",
      uploaded_at: "2026-11-20",
      file_url: "https://example.com/materials/math-integration-part1.pdf",
    },
    {
      id: 302,
      title: "Wave Optics & Interference Laboratory Tutorial",
      subject_name: "Physics",
      uploaded_at: "2026-11-18",
      file_url: "https://example.com/materials/physics-optics-tute2.pdf",
    },
    {
      id: 303,
      title: "Organic Reaction Mechanisms Summary Sheet",
      subject_name: "Chemistry",
      uploaded_at: "2026-11-15",
      file_url: "https://example.com/materials/chemistry-organic-summary.pdf",
    },
    {
      id: 304,
      title: "Applied Mathematics - Circular Motion Problem Set",
      subject_name: "Combined Mathematics",
      uploaded_at: "2026-11-10",
      file_url: "https://example.com/materials/applied-math-circular.pdf",
    },
  ],
};

export const MOCK_STUDENT_MARKS = [
  { id: 1, subject_name: "Combined Mathematics", term_number: 1, marks: 84 },
  { id: 2, subject_name: "Physics", term_number: 1, marks: 78 },
  { id: 3, subject_name: "Chemistry", term_number: 1, marks: 73 },
  { id: 4, subject_name: "Combined Mathematics", term_number: 2, marks: 88 },
  { id: 5, subject_name: "Physics", term_number: 2, marks: 82 },
  { id: 6, subject_name: "Chemistry", term_number: 2, marks: 76 },
];

export const MOCK_TEACHER_DASHBOARD = {
  teacher_name: "Dr. Samantha Perera",
  total_students: 48,
  average_attendance: 88.6,
  active_classes_count: 3,
  at_risk_students: [
    {
      student_id: 104,
      student_name: "Kasun Silva",
      class_name: "Combined Mathematics - Gr 12",
      attendance_pct: 68.0,
      term_marks_avg: 38.5,
      status: "High Risk",
      reason: "Attendance < 75% & Marks < 40",
      last_active: "2 days ago",
    },
    {
      student_id: 108,
      student_name: "Nipuni Fernando",
      class_name: "Applied Mathematics - Gr 11",
      attendance_pct: 79.0,
      term_marks_avg: 54.0,
      status: "Medium Risk",
      reason: "Attendance in caution range (75% - 85%)",
      last_active: "Yesterday",
    },
    {
      student_id: 112,
      student_name: "Dulitha Jayasuriya",
      class_name: "Combined Mathematics - Gr 12",
      attendance_pct: 72.5,
      term_marks_avg: 48.0,
      status: "High Risk",
      reason: "Consecutive absences detected (3 days)",
      last_active: "3 days ago",
    },
  ],
  classes: [
    { id: 1, subject_name: "Combined Mathematics", grade_level: "Grade 12", student_count: 26 },
    { id: 2, subject_name: "Applied Mathematics", grade_level: "Grade 11", student_count: 22 },
  ],
};

export const MOCK_CLASS_STUDENTS = {
  1: [
    { id: 101, full_name: "John Doe", email: "student@test.com" },
    { id: 102, full_name: "Amara Perera", email: "amara@test.com" },
    { id: 103, full_name: "Kamal Jayawardena", email: "kamal@test.com" },
    { id: 104, full_name: "Kasun Silva", email: "kasun@test.com" },
    { id: 105, full_name: "Sanduni Wickramasinghe", email: "sanduni@test.com" },
  ],
  2: [
    { id: 106, full_name: "Dineth Mendis", email: "dineth@test.com" },
    { id: 107, full_name: "Ananya Ranasinghe", email: "ananya@test.com" },
    { id: 108, full_name: "Nipuni Fernando", email: "nipuni@test.com" },
  ],
};

export const MOCK_CLASS_SCHEDULES = {
  1: [
    { id: 501, date: "2026-11-23", start_time: "08:30 AM" },
    { id: 502, date: "2026-11-25", start_time: "08:30 AM" },
    { id: 503, date: "2026-11-28", start_time: "08:30 AM" },
  ],
  2: [
    { id: 504, date: "2026-11-24", start_time: "10:15 AM" },
    { id: 505, date: "2026-11-27", start_time: "10:15 AM" },
  ],
};

export const MOCK_PARENT_DASHBOARD = {
  parent_name: "Mr. Nimal",
  child: {
    id: 101,
    full_name: "John Doe",
    grade_level: "Grade 11 - Batch A",
  },
  safe_box: {
    student_id: 101,
    status: "Safe",
    attendance_percentage: 92.5,
    term_marks_average: 78.4,
    warnings: [],
  },
  attendance_summary: {
    total_classes: 24,
    attended: 22,
    absent: 2,
    attendance_pct: 91.7,
  },
  attendance_records: [
    { date: "2026-11-18", subject: "Combined Mathematics", status: "Present" },
    { date: "2026-11-15", subject: "Physics", status: "Present" },
    { date: "2026-11-11", subject: "Combined Mathematics", status: "Present" },
    { date: "2026-11-08", subject: "Chemistry", status: "Absent" },
    { date: "2026-11-04", subject: "Combined Mathematics", status: "Present" },
  ],
  term_marks: [
    { id: 1, subject: "Combined Mathematics", term: 1, marks: 84 },
    { id: 2, subject: "Physics", term: 1, marks: 78 },
    { id: 3, subject: "Chemistry", term: 1, marks: 73 },
    { id: 4, subject: "Combined Mathematics", term: 2, marks: 88 },
    { id: 5, subject: "Physics", term: 2, marks: 82 },
  ],
  fee_payments: [
    {
      id: 1,
      month: "October 2026",
      amount: 7500,
      status: "Paid",
      paid_date: "2026-10-05",
      receipt_no: "REC-2026-0881",
    },
    {
      id: 2,
      month: "November 2026",
      amount: 7500,
      status: "Paid",
      paid_date: "2026-11-04",
      receipt_no: "REC-2026-1042",
    },
    {
      id: 3,
      month: "December 2026",
      amount: 7500,
      status: "Pending",
      due_date: "2026-12-10",
      receipt_no: null,
    },
  ],
};

export const MOCK_ADMIN_CLASSES = [
  {
    id: 1,
    subject_name: "Combined Mathematics",
    grade_level: "Grade 12",
    teacher_name: "Dr. Samantha Perera",
    teacher_id: 2,
    student_count: 26,
  },
  {
    id: 2,
    subject_name: "Physics (Advanced Level)",
    grade_level: "Grade 12",
    teacher_name: "Prof. K. Wijesinghe",
    teacher_id: 3,
    student_count: 24,
  },
  {
    id: 3,
    subject_name: "Chemistry Revision Batch",
    grade_level: "Grade 11",
    teacher_name: "Dr. Samantha Perera",
    teacher_id: 2,
    student_count: 22,
  },
];

export const MOCK_ADMIN_TEACHERS = [
  {
    id: 2,
    full_name: "Dr. Samantha Perera",
    email: "teacher@test.com",
    specialty: "Combined Mathematics",
  },
  {
    id: 3,
    full_name: "Prof. K. Wijesinghe",
    email: "wijesinghe@test.com",
    specialty: "Advanced Physics",
  },
];
