from datetime import date, datetime
from typing import Optional, Literal, List
from pydantic import BaseModel, ConfigDict, Field, computed_field


# ==========================================
# 1. Authentication & User Schemas (Preserved)
# ==========================================

# Schema for when a user registers
class UserCreate(BaseModel):
    email: str
    password: str
    role: str
    full_name: str

# Schema for when a user logs in
class UserLogin(BaseModel):
    email: str
    password: str

# Schema for the Token response we send back to React
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str

class UserResponse(BaseModel):
    id: int
    email: str
    role: str
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 2. Parent Schemas
# ==========================================

class ParentBase(BaseModel):
    full_name: str
    phone: Optional[str] = None

class ParentCreate(ParentBase):
    user_id: Optional[int] = None

class ParentUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None

class ParentResponse(ParentBase):
    id: int
    user_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 3. Student Schemas
# ==========================================

class StudentBase(BaseModel):
    full_name: str
    grade: Optional[str] = None
    dob: Optional[date] = None
    phone: Optional[str] = None
    parent_email: Optional[str] = None
    safe_box_status: Optional[str] = "Safe"
    parent_id: Optional[int] = None

class StudentCreate(StudentBase):
    user_id: Optional[int] = None

class StudentUpdate(BaseModel):
    full_name: Optional[str] = None
    grade: Optional[str] = None
    dob: Optional[date] = None
    phone: Optional[str] = None
    parent_email: Optional[str] = None
    safe_box_status: Optional[str] = None
    parent_id: Optional[int] = None

class StudentResponse(StudentBase):
    id: int
    user_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 4. Teacher Schemas
# ==========================================

class TeacherBase(BaseModel):
    full_name: str
    dob: Optional[date] = None
    phone: Optional[str] = None

class TeacherCreate(TeacherBase):
    user_id: Optional[int] = None

class TeacherUpdate(BaseModel):
    full_name: Optional[str] = None
    dob: Optional[date] = None
    phone: Optional[str] = None

class TeacherResponse(TeacherBase):
    id: int
    user_id: Optional[int] = None
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 5. Class Batch Schemas
# ==========================================

class ClassBatchBase(BaseModel):
    teacher_id: int
    subject_name: str
    grade_level: str

class ClassBatchCreate(ClassBatchBase):
    pass

class ClassBatchUpdate(BaseModel):
    teacher_id: Optional[int] = None
    subject_name: Optional[str] = None
    grade_level: Optional[str] = None

class ClassBatchResponse(ClassBatchBase):
    class_id: int
    model_config = ConfigDict(from_attributes=True)

# Aliases matching ERD naming convention
Class_BatchCreate = ClassBatchCreate
Class_BatchResponse = ClassBatchResponse
Class_BatchUpdate = ClassBatchUpdate


# ==========================================
# 6. Enrollment Schemas (M:N Link)
# ==========================================

class EnrollmentBase(BaseModel):
    student_id: int
    class_id: int

class EnrollmentCreate(EnrollmentBase):
    pass

class EnrollmentResponse(EnrollmentBase):
    id: int
    enrolled_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 7. Class Schedule Schemas
# ==========================================

class ClassScheduleBase(BaseModel):
    class_id: int
    session_date: date
    start_time: str  # e.g., "08:30 AM" or "14:00"

class ClassScheduleCreate(ClassScheduleBase):
    pass

class ClassScheduleUpdate(BaseModel):
    class_id: Optional[int] = None
    session_date: Optional[date] = None
    start_time: Optional[str] = None

class ClassScheduleResponse(ClassScheduleBase):
    schedule_id: int
    model_config = ConfigDict(from_attributes=True)

# Aliases matching ERD naming convention
Class_ScheduleCreate = ClassScheduleCreate
Class_ScheduleResponse = ClassScheduleResponse
Class_ScheduleUpdate = ClassScheduleUpdate


# ==========================================
# 8. Attendance Schemas
# ==========================================

class AttendanceBase(BaseModel):
    schedule_id: int
    student_id: int
    status: Literal["Present", "Absent"] = "Present"

class AttendanceCreate(AttendanceBase):
    pass

class AttendanceUpdate(BaseModel):
    status: Literal["Present", "Absent"]

class AttendanceResponse(AttendanceBase):
    id: int
    model_config = ConfigDict(from_attributes=True)


# ==========================================
# 9. Tute Material Schemas
# ==========================================

class TuteMaterialBase(BaseModel):
    class_id: int
    title: str
    file_url: str

class TuteMaterialCreate(TuteMaterialBase):
    pass

class TuteMaterialUpdate(BaseModel):
    title: Optional[str] = None
    file_url: Optional[str] = None

class TuteMaterialResponse(TuteMaterialBase):
    id: int
    uploaded_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)

# Aliases matching ERD naming convention
Tute_MaterialCreate = TuteMaterialCreate
Tute_MaterialResponse = TuteMaterialResponse
Tute_MaterialUpdate = TuteMaterialUpdate


# ==========================================
# 10. Term Test Mark Schemas
# ==========================================

class TermTestMarkBase(BaseModel):
    student_id: int
    subject_name: str
    term_number: int = Field(..., ge=1, le=3, description="School term number (1, 2, or 3)")
    marks: float = Field(..., ge=0, le=100, description="Marks obtained (0 - 100)")

class TermTestMarkCreate(TermTestMarkBase):
    pass

class TermTestMarkUpdate(BaseModel):
    subject_name: Optional[str] = None
    term_number: Optional[int] = Field(default=None, ge=1, le=3)
    marks: Optional[float] = Field(default=None, ge=0, le=100)

class TermTestMarkResponse(TermTestMarkBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

# Aliases matching ERD naming convention
Term_Test_MarkCreate = TermTestMarkCreate
Term_Test_MarkResponse = TermTestMarkResponse
Term_Test_MarkUpdate = TermTestMarkUpdate


# ==========================================
# 11. Fee Payment Schemas (LKR Currency Logic)
# ==========================================

class FeePaymentBase(BaseModel):
    student_id: int
    month: str  # e.g., "October 2026" or "2026-10"
    amount: float = Field(..., ge=0, description="Fee amount in LKR (Sri Lankan Rupee)")
    currency: str = Field(default="LKR", description="Currency code (LKR)")
    status: Literal["Paid", "Pending"] = Field(default="Pending", description="Fee status: Paid or Pending")
    payment_date: Optional[date] = None

class FeePaymentCreate(FeePaymentBase):
    pass

class FeePaymentUpdate(BaseModel):
    amount: Optional[float] = Field(default=None, ge=0)
    month: Optional[str] = None
    status: Optional[Literal["Paid", "Pending"]] = None
    payment_date: Optional[date] = None

class FeePaymentResponse(FeePaymentBase):
    id: int
    model_config = ConfigDict(from_attributes=True)

    @computed_field
    @property
    def formatted_amount(self) -> str:
        """Formatted display string for LKR currency (e.g., LKR 2,500.00)"""
        return f"{self.currency} {self.amount:,.2f}"

# Aliases matching ERD naming convention
Fee_PaymentCreate = FeePaymentCreate
Fee_PaymentResponse = FeePaymentResponse
Fee_PaymentUpdate = FeePaymentUpdate


# ==========================================
# 12. SAFE Box & Dashboard Schemas (Phase 3)
# ==========================================

# ------ SAFE Box ------

class SafeBoxResponse(BaseModel):
    """
    Dynamically calculated SAFE Box risk status for a student.

    Risk levels (colour-coded):
      - High Risk  (Red)    : attendance < 75%  OR  avg term marks < 40%
      - Medium Risk (Yellow): attendance 75–85% OR  marks dropped > 15% vs prev term
      - Safe        (Green) : attendance > 85%  AND avg term marks >= 50%
    """
    student_id: int
    student_name: str
    status: Literal["High Risk", "Medium Risk", "Safe"]
    color: Literal["Red", "Yellow", "Green"]
    overall_attendance_pct: Optional[float] = Field(
        None, description="Overall attendance percentage (0–100). None if no sessions recorded."
    )
    avg_term_marks: Optional[float] = Field(
        None, description="Average mark across all recorded term tests. None if no marks recorded."
    )
    latest_term: Optional[int] = Field(
        None, description="Most recent term number for which marks exist."
    )
    prev_term: Optional[int] = Field(
        None, description="Previous term number used for drop comparison."
    )
    latest_term_avg: Optional[float] = Field(
        None, description="Average mark in the latest term."
    )
    prev_term_avg: Optional[float] = Field(
        None, description="Average mark in the previous term."
    )
    reasons: List[str] = Field(
        default_factory=list,
        description="Human-readable list of triggered risk conditions.",
    )
    model_config = ConfigDict(from_attributes=True)


# ------ Teacher Dashboard ------

class AtRiskStudentSummary(BaseModel):
    """Lightweight view of an at-risk student shown in the teacher dashboard."""
    student_id: int
    student_name: str
    safe_box_status: str       # "High Risk" | "Medium Risk" | "Safe"
    safe_box_color: str        # "Red" | "Yellow" | "Green"
    overall_attendance_pct: Optional[float] = None
    avg_term_marks: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)


class UpcomingScheduleItem(BaseModel):
    """A single upcoming class session."""
    schedule_id: int
    class_id: int
    subject_name: str
    grade_level: str
    session_date: date
    start_time: str
    model_config = ConfigDict(from_attributes=True)


class TeacherDashboardStats(BaseModel):
    """Response body for GET /teacher/dashboard-stats."""
    teacher_name: str
    total_students: int
    at_risk_students: List[AtRiskStudentSummary]
    upcoming_schedules: List[UpcomingScheduleItem]
    model_config = ConfigDict(from_attributes=True)


# ------ Student Dashboard ------

class DownloadableTute(BaseModel):
    """A tute/material the student can download."""
    id: int
    class_id: int
    subject_name: str
    title: str
    file_url: str
    uploaded_at: Optional[datetime] = None
    model_config = ConfigDict(from_attributes=True)


class StudentDashboardStats(BaseModel):
    """Response body for GET /student/dashboard-stats."""
    student_name: str
    safe_box: SafeBoxResponse
    upcoming_schedules: List[UpcomingScheduleItem]
    recent_attendance_pct: Optional[float] = Field(
        None,
        description=(
            "Attendance percentage for the student's last 30 days of sessions. "
            "None if no sessions exist in that window."
        ),
    )
    downloadable_tutes: List[DownloadableTute]
    model_config = ConfigDict(from_attributes=True)