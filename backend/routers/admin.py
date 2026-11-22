"""
Admin-only routes.

POST /classes        — Create a new Class_Batch (admin only)
POST /assign-teacher — Reassign a teacher to an existing class (admin only)
GET  /classes        — List all classes with teacher info
GET  /teachers       — List all teachers (for assignment UI)
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from database import get_db
from dependencies import require_role
import models
import schemas

router = APIRouter(prefix="/admin", tags=["Admin"])

# Shorthand dependency — must be admin to hit any of these routes
AdminOnly = Depends(require_role("admin"))


# ---------------------------------------------------------------------------
# POST /admin/classes  — Create a new class batch
# ---------------------------------------------------------------------------
@router.post(
    "/classes",
    response_model=schemas.ClassBatchResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new class batch",
)
def create_class(
    payload: schemas.ClassBatchCreate,
    db: Session = Depends(get_db),
    _: models.User = AdminOnly,
):
    """
    Admin creates a new Class_Batch by specifying the teacher, subject, and
    grade level.  The teacher must already exist in the teachers table.
    """
    # Verify the teacher exists
    teacher = db.query(models.Teacher).filter(
        models.Teacher.id == payload.teacher_id
    ).first()
    if not teacher:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Teacher with id={payload.teacher_id} not found.",
        )

    new_class = models.Class_Batch(
        teacher_id=payload.teacher_id,
        subject_name=payload.subject_name,
        grade_level=payload.grade_level,
    )
    db.add(new_class)
    db.commit()
    db.refresh(new_class)
    return new_class


# ---------------------------------------------------------------------------
# POST /admin/assign-teacher  — Reassign a teacher to an existing class
# ---------------------------------------------------------------------------
class AssignTeacherPayload(schemas.ClassBatchUpdate):
    """Reuses ClassBatchUpdate but makes class_id required."""
    class_id: int


@router.post(
    "/assign-teacher",
    response_model=schemas.ClassBatchResponse,
    summary="Assign (or reassign) a teacher to a class batch",
)
def assign_teacher(
    payload: AssignTeacherPayload,
    db: Session = Depends(get_db),
    _: models.User = AdminOnly,
):
    """
    Admin reassigns a teacher to an existing Class_Batch.
    Only `teacher_id` is required in the body alongside `class_id`.
    """
    class_batch = db.query(models.Class_Batch).filter(
        models.Class_Batch.class_id == payload.class_id
    ).first()
    if not class_batch:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Class with id={payload.class_id} not found.",
        )

    if payload.teacher_id is not None:
        teacher = db.query(models.Teacher).filter(
            models.Teacher.id == payload.teacher_id
        ).first()
        if not teacher:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Teacher with id={payload.teacher_id} not found.",
            )
        class_batch.teacher_id = payload.teacher_id

    # Allow updating subject/grade too if provided
    if payload.subject_name is not None:
        class_batch.subject_name = payload.subject_name
    if payload.grade_level is not None:
        class_batch.grade_level = payload.grade_level

    db.commit()
    db.refresh(class_batch)
    return class_batch


# ---------------------------------------------------------------------------
# GET /admin/classes  — List all class batches (admin overview)
# ---------------------------------------------------------------------------
@router.get(
    "/classes",
    response_model=list[schemas.ClassBatchResponse],
    summary="List all class batches",
)
def list_classes(
    db: Session = Depends(get_db),
    _: models.User = AdminOnly,
):
    return db.query(models.Class_Batch).all()


# ---------------------------------------------------------------------------
# GET /admin/teachers  — List all teachers (for assignment dropdowns)
# ---------------------------------------------------------------------------
@router.get(
    "/teachers",
    response_model=list[schemas.TeacherResponse],
    summary="List all teachers",
)
def list_teachers(
    db: Session = Depends(get_db),
    _: models.User = AdminOnly,
):
    return db.query(models.Teacher).all()
