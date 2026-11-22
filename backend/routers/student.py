"""
Student routes.

POST /student/term-marks                — Student submits their school term marks for verification
GET  /student/term-marks                — Student views their own term marks
GET  /student/classes                   — Student views their enrolled classes
GET  /student/attendance                — Student views their own attendance record
GET  /student/fees                      — Student views their fee payment status
GET  /student/{student_id}/safebox      — Dynamically calculate SAFE Box risk status
GET  /student/dashboard-stats           — Student dashboard: SAFE Box, schedules, attendance, tutes
"""

from datetime import date, timedelta
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_role
import models
import schemas
from safebox import calculate_safebox

router = APIRouter(prefix="/student", tags=["Student"])

StudentOnly = Depends(require_role("student", "admin"))


def _get_student_profile(current_user: models.User, db: Session) -> models.Student:
    """Resolve the Student profile for the authenticated user."""
    student = db.query(models.Student).filter(
        models.Student.user_id == current_user.id
    ).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No student profile found for your account. Contact an admin.",
        )
    return student


# ---------------------------------------------------------------------------
# POST /student/term-marks  — Student submits term marks for verification
# ---------------------------------------------------------------------------
@router.post(
    "/term-marks",
    response_model=schemas.TermTestMarkResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Submit school term marks for verification",
)
def submit_term_marks(
    payload: schemas.TermTestMarkCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "admin")),
):
    """
    A student self-reports their school term test marks for a given subject
    and term.  If a record for (student, subject, term) already exists it
    is updated in place rather than creating a duplicate (upsert).

    The teacher or admin can later verify / override these figures.
    """
    student = _get_student_profile(current_user, db)

    # Students may only submit marks for themselves; admins can submit for anyone
    if current_user.role == "student" and payload.student_id != student.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="You can only submit marks for your own student profile.",
        )

    # Upsert: update if (student_id, subject_name, term_number) already exists
    existing = db.query(models.Term_Test_Mark).filter(
        models.Term_Test_Mark.student_id == payload.student_id,
        models.Term_Test_Mark.subject_name == payload.subject_name,
        models.Term_Test_Mark.term_number == payload.term_number,
    ).first()

    if existing:
        existing.marks = payload.marks
        db.commit()
        db.refresh(existing)
        return existing

    new_mark = models.Term_Test_Mark(
        student_id=payload.student_id,
        subject_name=payload.subject_name,
        term_number=payload.term_number,
        marks=payload.marks,
    )
    db.add(new_mark)
    db.commit()
    db.refresh(new_mark)
    return new_mark


# ---------------------------------------------------------------------------
# GET /student/term-marks  — Student views all their own term marks
# ---------------------------------------------------------------------------
@router.get(
    "/term-marks",
    response_model=list[schemas.TermTestMarkResponse],
    summary="View your own term test marks",
)
def get_own_term_marks(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "admin")),
):
    student = _get_student_profile(current_user, db)
    return (
        db.query(models.Term_Test_Mark)
        .filter(models.Term_Test_Mark.student_id == student.id)
        .order_by(models.Term_Test_Mark.term_number)
        .all()
    )


# ---------------------------------------------------------------------------
# GET /student/classes  — Student views their enrolled classes
# ---------------------------------------------------------------------------
@router.get(
    "/classes",
    response_model=list[schemas.ClassBatchResponse],
    summary="View classes you are enrolled in",
)
def get_enrolled_classes(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "admin")),
):
    student = _get_student_profile(current_user, db)
    enrollments = (
        db.query(models.Enrollment)
        .filter(models.Enrollment.student_id == student.id)
        .all()
    )
    class_ids = [e.class_id for e in enrollments]
    return (
        db.query(models.Class_Batch)
        .filter(models.Class_Batch.class_id.in_(class_ids))
        .all()
    )


# ---------------------------------------------------------------------------
# GET /student/attendance  — Student views their own attendance
# ---------------------------------------------------------------------------
@router.get(
    "/attendance",
    response_model=list[schemas.AttendanceResponse],
    summary="View your own attendance records",
)
def get_own_attendance(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "admin")),
):
    student = _get_student_profile(current_user, db)
    return (
        db.query(models.Attendance)
        .filter(models.Attendance.student_id == student.id)
        .all()
    )


# ---------------------------------------------------------------------------
# GET /student/fees  — Student views their fee payment history
# ---------------------------------------------------------------------------
@router.get(
    "/fees",
    response_model=list[schemas.FeePaymentResponse],
    summary="View your fee payment history",
)
def get_own_fees(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "admin")),
):
    student = _get_student_profile(current_user, db)
    return (
        db.query(models.Fee_Payment)
        .filter(models.Fee_Payment.student_id == student.id)
        .order_by(models.Fee_Payment.month)
        .all()
    )


# ---------------------------------------------------------------------------
# GET /student/{student_id}/safebox  — Dynamically calculate SAFE Box risk
# ---------------------------------------------------------------------------
@router.get(
    "/{student_id}/safebox",
    response_model=schemas.SafeBoxResponse,
    summary="Calculate the SAFE Box risk status for a student",
)
def get_safebox(
    student_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "teacher", "admin")),
):
    """
    Dynamically computes and returns the SAFE Box risk status for the given
    student based on attendance and term mark data.

    **Access rules:**
    - A student may only query their own SAFE Box.
    - Teachers and admins may query any student.

    **Risk levels:**
    | Status       | Colour | Condition |
    |---|---|---|
    | High Risk    | 🔴 Red    | Attendance < 75 % **OR** avg marks < 40 |
    | Medium Risk  | 🟡 Yellow | Attendance 75–85 % **OR** marks dropped > 15 pts vs prev term |
    | Safe         | 🟢 Green  | Attendance > 85 % **AND** avg marks ≥ 50 |
    """
    # Students can only view their own SAFE Box
    if current_user.role == "student":
        own_profile = _get_student_profile(current_user, db)
        if own_profile.id != student_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only view your own SAFE Box status.",
            )

    student = db.query(models.Student).filter(models.Student.id == student_id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Student with id={student_id} not found.",
        )

    result = calculate_safebox(student, db)

    # Persist the computed status to the student record so other parts of the
    # system (e.g. admin lists) can display a cached value without recalculating.
    student.safe_box_status = result.status
    db.commit()

    return result


# ---------------------------------------------------------------------------
# GET /student/dashboard-stats  — Student dashboard aggregate
# ---------------------------------------------------------------------------
@router.get(
    "/dashboard-stats",
    response_model=schemas.StudentDashboardStats,
    summary="Student dashboard: SAFE Box, upcoming classes, attendance, tutes",
)
def get_student_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("student", "admin")),
):
    """
    Returns a single response that powers the student's dashboard:

    - **safe_box**: Dynamically calculated SAFE Box risk status.
    - **upcoming_schedules**: Next 14 days of class sessions (across all enrolled classes).
    - **recent_attendance_pct**: Attendance % for sessions in the last 30 days.
    - **downloadable_tutes**: All study materials uploaded to the student's classes.
    """
    student = _get_student_profile(current_user, db)

    # ── SAFE Box ──────────────────────────────────────────────────────────
    safe_box = calculate_safebox(student, db)

    # Persist cached status
    student.safe_box_status = safe_box.status
    db.commit()

    # ── Enrolled class IDs ────────────────────────────────────────────────
    enrolled_class_ids: List[int] = [e.class_id for e in student.enrollments]

    # ── Upcoming schedules (next 14 days) ─────────────────────────────────
    today = date.today()
    cutoff = today + timedelta(days=14)

    upcoming_schedules: List[schemas.UpcomingScheduleItem] = []
    if enrolled_class_ids:
        raw_schedules = (
            db.query(models.Class_Schedule, models.Class_Batch)
            .join(
                models.Class_Batch,
                models.Class_Schedule.class_id == models.Class_Batch.class_id,
            )
            .filter(
                models.Class_Schedule.class_id.in_(enrolled_class_ids),
                models.Class_Schedule.session_date >= today,
                models.Class_Schedule.session_date <= cutoff,
            )
            .order_by(models.Class_Schedule.session_date)
            .all()
        )
        for sched, batch in raw_schedules:
            upcoming_schedules.append(
                schemas.UpcomingScheduleItem(
                    schedule_id=sched.schedule_id,
                    class_id=batch.class_id,
                    subject_name=batch.subject_name,
                    grade_level=batch.grade_level,
                    session_date=sched.session_date,
                    start_time=sched.start_time,
                )
            )

    # ── Recent attendance % (last 30 days) ────────────────────────────────
    recent_attendance_pct: float | None = None
    if enrolled_class_ids:
        thirty_days_ago = today - timedelta(days=30)
        recent_session_ids = [
            s.schedule_id
            for s in db.query(models.Class_Schedule)
            .filter(
                models.Class_Schedule.class_id.in_(enrolled_class_ids),
                models.Class_Schedule.session_date >= thirty_days_ago,
                models.Class_Schedule.session_date <= today,
            )
            .all()
        ]
        if recent_session_ids:
            present_count = (
                db.query(models.Attendance)
                .filter(
                    models.Attendance.student_id == student.id,
                    models.Attendance.schedule_id.in_(recent_session_ids),
                    models.Attendance.status == "Present",
                )
                .count()
            )
            recent_attendance_pct = round(
                (present_count / len(recent_session_ids)) * 100, 2
            )

    # ── Downloadable tutes ────────────────────────────────────────────────
    downloadable_tutes: List[schemas.DownloadableTute] = []
    if enrolled_class_ids:
        raw_tutes = (
            db.query(models.Tute_Material, models.Class_Batch)
            .join(
                models.Class_Batch,
                models.Tute_Material.class_id == models.Class_Batch.class_id,
            )
            .filter(models.Tute_Material.class_id.in_(enrolled_class_ids))
            .order_by(models.Tute_Material.uploaded_at.desc())
            .all()
        )
        for tute, batch in raw_tutes:
            downloadable_tutes.append(
                schemas.DownloadableTute(
                    id=tute.id,
                    class_id=tute.class_id,
                    subject_name=batch.subject_name,
                    title=tute.title,
                    file_url=tute.file_url,
                    uploaded_at=tute.uploaded_at,
                )
            )

    return schemas.StudentDashboardStats(
        student_name=student.full_name,
        safe_box=safe_box,
        upcoming_schedules=upcoming_schedules,
        recent_attendance_pct=recent_attendance_pct,
        downloadable_tutes=downloadable_tutes,
    )
