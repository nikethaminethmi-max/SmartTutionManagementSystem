"""
Teacher-only routes.

POST /classes/{class_id}/schedule  — Add a class session date/time
POST /classes/{class_id}/tutes     — Upload a study material link
POST /attendance                   — Bulk-submit attendance for a schedule
GET  /classes/{class_id}/schedule  — View schedule for own class
GET  /classes/{class_id}/students  — List enrolled students
GET  /teacher/dashboard-stats      — Teacher dashboard: students at-risk, upcoming schedules
"""

from datetime import date, timedelta
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_role, get_current_user
import models
import schemas
from safebox import calculate_safebox

router = APIRouter(prefix="/teacher", tags=["Teacher"])

TeacherOnly = Depends(require_role("teacher", "admin"))  # admin can also access


def _assert_owns_class(
    class_id: int,
    current_user: models.User,
    db: Session,
) -> models.Class_Batch:
    """
    Verify the class exists and belongs to the authenticated teacher.
    Admins bypass ownership checks.
    """
    class_batch = db.query(models.Class_Batch).filter(
        models.Class_Batch.class_id == class_id
    ).first()
    if not class_batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with id={class_id} not found.",
        )

    if current_user.role != "admin":
        teacher = db.query(models.Teacher).filter(
            models.Teacher.user_id == current_user.id
        ).first()
        if not teacher or class_batch.teacher_id != teacher.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You are not the teacher of this class.",
            )

    return class_batch


# ---------------------------------------------------------------------------
# POST /teacher/classes/{class_id}/schedule  — Add a class session
# ---------------------------------------------------------------------------
@router.post(
    "/classes/{class_id}/schedule",
    response_model=schemas.ClassScheduleResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Add a session date/time to a class",
)
def add_schedule(
    class_id: int,
    payload: schemas.ClassScheduleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("teacher", "admin")),
):
    """
    Teacher adds a new session (date + start_time) for their class.
    The class_id in the URL must match the one in the payload.
    """
    _assert_owns_class(class_id, current_user, db)

    # Ensure payload class_id is consistent with the URL
    if payload.class_id != class_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Payload class_id must match the URL class_id.",
        )

    new_schedule = models.Class_Schedule(
        class_id=class_id,
        session_date=payload.session_date,
        start_time=payload.start_time,
    )
    db.add(new_schedule)
    db.commit()
    db.refresh(new_schedule)
    return new_schedule


# ---------------------------------------------------------------------------
# POST /teacher/classes/{class_id}/tutes  — Upload study material
# ---------------------------------------------------------------------------
@router.post(
    "/classes/{class_id}/tutes",
    response_model=schemas.TuteMaterialResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a study material link for a class",
)
def upload_tute(
    class_id: int,
    payload: schemas.TuteMaterialCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("teacher", "admin")),
):
    """
    Teacher uploads a study material (title + file URL) for their class.
    `file_url` should be a publicly accessible link (e.g., Google Drive, S3).
    """
    _assert_owns_class(class_id, current_user, db)

    if payload.class_id != class_id:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Payload class_id must match the URL class_id.",
        )

    new_material = models.Tute_Material(
        class_id=class_id,
        title=payload.title,
        file_url=payload.file_url,
    )
    db.add(new_material)
    db.commit()
    db.refresh(new_material)
    return new_material


# ---------------------------------------------------------------------------
# POST /teacher/attendance  — Bulk submit attendance for a schedule
# ---------------------------------------------------------------------------
class AttendanceBulkCreate(schemas.BaseModel if False else object):
    pass


from pydantic import BaseModel as _PydanticBase


class AttendanceBulkPayload(_PydanticBase):
    """
    Submit attendance for an entire session in one request.
    `records` is a list of {student_id, status} pairs.
    Existing attendance for this schedule is replaced (upsert logic).
    """
    schedule_id: int
    records: List[schemas.AttendanceCreate]


class AttendanceBulkResponse(_PydanticBase):
    schedule_id: int
    saved: int
    message: str


@router.post(
    "/attendance",
    response_model=AttendanceBulkResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Bulk-submit attendance records for a class session",
)
def submit_attendance(
    payload: AttendanceBulkPayload,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("teacher", "admin")),
):
    """
    Teacher submits a full attendance list for a given schedule_id.
    Any pre-existing attendance rows for that schedule are deleted first
    (idempotent — re-submitting overwrites the previous attempt).
    """
    # Verify schedule exists and belongs to this teacher's class
    schedule = db.query(models.Class_Schedule).filter(
        models.Class_Schedule.schedule_id == payload.schedule_id
    ).first()
    if not schedule:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Schedule with id={payload.schedule_id} not found.",
        )

    _assert_owns_class(schedule.class_id, current_user, db)

    # Validate that all supplied student_ids are enrolled in this class
    enrolled_ids = {
        e.student_id
        for e in db.query(models.Enrollment).filter(
            models.Enrollment.class_id == schedule.class_id
        ).all()
    }
    for record in payload.records:
        if record.student_id not in enrolled_ids:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=(
                    f"Student id={record.student_id} is not enrolled "
                    f"in class id={schedule.class_id}."
                ),
            )
        if record.schedule_id != payload.schedule_id:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="All records must reference the same schedule_id as the payload.",
            )

    # Idempotent upsert: delete old records for this schedule, then insert new ones
    db.query(models.Attendance).filter(
        models.Attendance.schedule_id == payload.schedule_id
    ).delete(synchronize_session=False)

    attendance_rows = [
        models.Attendance(
            schedule_id=payload.schedule_id,
            student_id=rec.student_id,
            status=rec.status,
        )
        for rec in payload.records
    ]
    db.add_all(attendance_rows)
    db.commit()

    return AttendanceBulkResponse(
        schedule_id=payload.schedule_id,
        saved=len(attendance_rows),
        message=f"Attendance saved for {len(attendance_rows)} student(s).",
    )


# ---------------------------------------------------------------------------
# GET /teacher/classes/{class_id}/schedule  — View schedule for a class
# ---------------------------------------------------------------------------
@router.get(
    "/classes/{class_id}/schedule",
    response_model=list[schemas.ClassScheduleResponse],
    summary="List all sessions for a class",
)
def get_schedule(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("teacher", "admin")),
):
    _assert_owns_class(class_id, current_user, db)
    return (
        db.query(models.Class_Schedule)
        .filter(models.Class_Schedule.class_id == class_id)
        .order_by(models.Class_Schedule.session_date)
        .all()
    )


# ---------------------------------------------------------------------------
# GET /teacher/classes/{class_id}/students  — View enrolled students
# ---------------------------------------------------------------------------
@router.get(
    "/classes/{class_id}/students",
    response_model=list[schemas.StudentResponse],
    summary="List students enrolled in a class",
)
def get_enrolled_students(
    class_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("teacher", "admin")),
):
    _assert_owns_class(class_id, current_user, db)

    enrollments = (
        db.query(models.Enrollment)
        .filter(models.Enrollment.class_id == class_id)
        .all()
    )
    student_ids = [e.student_id for e in enrollments]
    return (
        db.query(models.Student)
        .filter(models.Student.id.in_(student_ids))
        .all()
    )


# ---------------------------------------------------------------------------
# GET /teacher/dashboard-stats  — Teacher dashboard aggregate
# ---------------------------------------------------------------------------
@router.get(
    "/dashboard-stats",
    response_model=schemas.TeacherDashboardStats,
    summary="Teacher dashboard: at-risk students and upcoming class schedules",
)
def get_teacher_dashboard(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_role("teacher", "admin")),
):
    """
    Returns a single payload that powers the teacher's dashboard:

    - **total_students**: Total unique students across all of the teacher's classes.
    - **at_risk_students**: Students rated "High Risk" or "Medium Risk" by the SAFE Box.
    - **upcoming_schedules**: Sessions in the next 14 days across all of the teacher's classes.
    """
    # ── Resolve teacher profile ───────────────────────────────────────────
    teacher = db.query(models.Teacher).filter(
        models.Teacher.user_id == current_user.id
    ).first()

    if not teacher and current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No teacher profile found for your account. Contact an admin.",
        )

    # Admins see all classes; teachers see only their own
    if current_user.role == "admin":
        teacher_classes = db.query(models.Class_Batch).all()
        teacher_name = "Admin (all classes)"
    else:
        teacher_classes = teacher.class_batches
        teacher_name = teacher.full_name

    class_ids: List[int] = [c.class_id for c in teacher_classes]

    # ── Collect unique students across all teacher's classes ──────────────
    unique_student_ids: set[int] = set()
    if class_ids:
        enrollments = (
            db.query(models.Enrollment)
            .filter(models.Enrollment.class_id.in_(class_ids))
            .all()
        )
        unique_student_ids = {e.student_id for e in enrollments}

    total_students = len(unique_student_ids)

    # ── Compute SAFE Box for every student; collect at-risk ones ─────────
    at_risk_students: List[schemas.AtRiskStudentSummary] = []
    for sid in unique_student_ids:
        student = db.query(models.Student).filter(models.Student.id == sid).first()
        if not student:
            continue

        safebox = calculate_safebox(student, db)

        # Persist cached status
        student.safe_box_status = safebox.status

        if safebox.status in ("High Risk", "Medium Risk"):
            at_risk_students.append(
                schemas.AtRiskStudentSummary(
                    student_id=student.id,
                    student_name=student.full_name,
                    safe_box_status=safebox.status,
                    safe_box_color=safebox.color,
                    overall_attendance_pct=safebox.overall_attendance_pct,
                    avg_term_marks=safebox.avg_term_marks,
                )
            )

    if unique_student_ids:
        db.commit()  # flush all safe_box_status updates in one round-trip

    # Sort: High Risk first, then Medium Risk, then alphabetical
    _order = {"High Risk": 0, "Medium Risk": 1, "Safe": 2}
    at_risk_students.sort(
        key=lambda s: (_order.get(s.safe_box_status, 3), s.student_name)
    )

    # ── Upcoming schedules (next 14 days) across teacher's classes ────────
    today = date.today()
    cutoff = today + timedelta(days=14)

    upcoming_schedules: List[schemas.UpcomingScheduleItem] = []
    if class_ids:
        raw = (
            db.query(models.Class_Schedule, models.Class_Batch)
            .join(
                models.Class_Batch,
                models.Class_Schedule.class_id == models.Class_Batch.class_id,
            )
            .filter(
                models.Class_Schedule.class_id.in_(class_ids),
                models.Class_Schedule.session_date >= today,
                models.Class_Schedule.session_date <= cutoff,
            )
            .order_by(models.Class_Schedule.session_date, models.Class_Schedule.start_time)
            .all()
        )
        for sched, batch in raw:
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

    return schemas.TeacherDashboardStats(
        teacher_name=teacher_name,
        total_students=total_students,
        at_risk_students=at_risk_students,
        upcoming_schedules=upcoming_schedules,
    )
