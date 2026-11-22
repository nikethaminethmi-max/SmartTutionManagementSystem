"""
Parent routes — Phase 5.

GET /parent/dashboard  — Child's SAFE Box, attendance history, term marks, fee payments.

The parent account is linked to one or more Student records via the `parent_id`
foreign key on the students table.  If the parent has multiple children, the
endpoint returns data for the *first* linked child (extendable later).
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_role
import models
import schemas
from safebox import calculate_safebox

router = APIRouter(prefix="/parent", tags=["Parent"])


# ── Response models ───────────────────────────────────────────────────────────

class AttendanceSummary(BaseModel):
    """Per-subject or overall attendance record for display."""
    total_sessions: int
    present_count: int
    absent_count: int
    attendance_pct: Optional[float] = None
    model_config = ConfigDict(from_attributes=True)


class TermMarkRow(BaseModel):
    """A single term mark entry for chart/table display."""
    subject_name: str
    term_number: int
    marks: float
    model_config = ConfigDict(from_attributes=True)


class FeePaymentRow(BaseModel):
    """Fee payment row with LKR formatting."""
    id: int
    month: str
    amount: float
    currency: str
    status: str          # "Paid" | "Pending"
    payment_date: Optional[str] = None
    formatted_amount: str
    model_config = ConfigDict(from_attributes=True)


class ChildInfo(BaseModel):
    student_id: int
    student_name: str
    grade: Optional[str] = None
    model_config = ConfigDict(from_attributes=True)


class ParentDashboardResponse(BaseModel):
    """Full response body for GET /parent/dashboard."""
    parent_name: str
    child: ChildInfo
    safe_box: schemas.SafeBoxResponse
    attendance_summary: AttendanceSummary
    term_marks: List[TermMarkRow]
    fee_payments: List[FeePaymentRow]
    model_config = ConfigDict(from_attributes=True)


# ── Helper ────────────────────────────────────────────────────────────────────

def _get_parent_profile(current_user: models.User, db: Session) -> models.Parent:
    parent = db.query(models.Parent).filter(
        models.Parent.user_id == current_user.id
    ).first()
    if not parent:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No parent profile found for your account. Contact an admin.",
        )
    return parent


# ── GET /parent/dashboard ─────────────────────────────────────────────────────

@router.get(
    "/dashboard",
    response_model=ParentDashboardResponse,
    summary="Parent dashboard: child's SAFE Box, attendance, marks, fees",
)
def get_parent_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("parent", "admin")),
):
    """
    Returns everything a parent needs to monitor their child's progress:

    - **safe_box**: Live SAFE Box risk calculation.
    - **attendance_summary**: Total sessions, present/absent counts, overall %.
    - **term_marks**: All recorded term test marks (for chart/table rendering).
    - **fee_payments**: Monthly fee history with LKR amounts and Paid/Pending status.
    """
    parent = _get_parent_profile(current_user, db)

    # ── Find linked child ─────────────────────────────────────────────────
    if not parent.students:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No student is linked to your parent account. Contact an admin.",
        )

    # Use first linked child; future versions can support multi-child selection
    student: models.Student = parent.students[0]

    # ── SAFE Box ──────────────────────────────────────────────────────────
    safe_box = calculate_safebox(student, db)
    student.safe_box_status = safe_box.status
    db.commit()

    # ── Attendance Summary ────────────────────────────────────────────────
    enrolled_class_ids = [e.class_id for e in student.enrollments]

    total_sessions = 0
    if enrolled_class_ids:
        total_sessions = (
            db.query(models.Class_Schedule)
            .filter(models.Class_Schedule.class_id.in_(enrolled_class_ids))
            .count()
        )

    present_count = (
        db.query(models.Attendance)
        .filter(
            models.Attendance.student_id == student.id,
            models.Attendance.status == "Present",
        )
        .count()
    )
    absent_count = total_sessions - present_count
    attendance_pct = (
        round((present_count / total_sessions) * 100, 2) if total_sessions > 0 else None
    )

    attendance_summary = AttendanceSummary(
        total_sessions=total_sessions,
        present_count=present_count,
        absent_count=absent_count,
        attendance_pct=attendance_pct,
    )

    # ── Term Marks ────────────────────────────────────────────────────────
    term_marks = [
        TermMarkRow(
            subject_name=m.subject_name,
            term_number=m.term_number,
            marks=m.marks,
        )
        for m in sorted(student.test_marks, key=lambda m: (m.term_number, m.subject_name))
    ]

    # ── Fee Payments ──────────────────────────────────────────────────────
    fee_payments = [
        FeePaymentRow(
            id=fp.id,
            month=fp.month,
            amount=fp.amount,
            currency=fp.currency,
            status=fp.status,
            payment_date=str(fp.payment_date) if fp.payment_date else None,
            formatted_amount=f"{fp.currency} {fp.amount:,.2f}",
        )
        for fp in sorted(student.fee_payments, key=lambda fp: fp.month, reverse=True)
    ]

    return ParentDashboardResponse(
        parent_name=parent.full_name,
        child=ChildInfo(
            student_id=student.id,
            student_name=student.full_name,
            grade=student.grade,
        ),
        safe_box=safe_box,
        attendance_summary=attendance_summary,
        term_marks=term_marks,
        fee_payments=fee_payments,
    )

