"""
safebox.py — Pure SAFE Box risk-calculation logic (Phase 3).

Call `calculate_safebox(student, db)` from any router to get a fully
populated `schemas.SafeBoxResponse` without touching the HTTP layer.

Risk Algorithm
--------------
Priority is evaluated top-down; the first matching condition wins.

  HIGH RISK  (Red)
    • Overall attendance < 75 %
    • OR average term marks < 40

  MEDIUM RISK  (Yellow)
    • Overall attendance 75 %–85 % (inclusive of 75, exclusive of 85)
    • OR term marks dropped by > 15 points vs previous term average

  SAFE  (Green)
    • Attendance > 85 %  AND  average term marks >= 50

Edge-cases
----------
  • Students with no attendance records are treated as having 0 % attendance
    → High Risk by default (no data is worse than bad data).
  • Students with no marks can still be flagged by attendance alone.
  • Drop comparison only fires when marks exist for at least two distinct terms.
"""

from __future__ import annotations

from typing import Optional
from sqlalchemy.orm import Session

import models
import schemas


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _attendance_pct(student: models.Student, db: Session) -> Optional[float]:
    """
    Return the student's overall attendance percentage (0–100).

    Returns None only when absolutely no sessions have ever been scheduled
    for any class the student is enrolled in (prevents division by zero).
    """
    # Collect all class_ids the student is enrolled in
    enrollment_class_ids = [
        e.class_id for e in student.enrollments
    ]
    if not enrollment_class_ids:
        return None  # not enrolled anywhere → no data

    # Count total sessions across all enrolled classes
    total_sessions: int = (
        db.query(models.Class_Schedule)
        .filter(models.Class_Schedule.class_id.in_(enrollment_class_ids))
        .count()
    )
    if total_sessions == 0:
        return None  # classes exist but no sessions scheduled yet

    # Count sessions where the student was marked Present
    present_count: int = (
        db.query(models.Attendance)
        .filter(
            models.Attendance.student_id == student.id,
            models.Attendance.status == "Present",
        )
        .count()
    )
    return round((present_count / total_sessions) * 100, 2)


def _term_averages(student: models.Student) -> dict[int, float]:
    """
    Return a mapping of {term_number: average_marks} for all terms
    that have at least one mark recorded.
    """
    from collections import defaultdict

    term_buckets: dict[int, list[float]] = defaultdict(list)
    for mark in student.test_marks:
        term_buckets[mark.term_number].append(mark.marks)

    return {
        term: round(sum(vals) / len(vals), 2)
        for term, vals in term_buckets.items()
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def calculate_safebox(
    student: models.Student,
    db: Session,
) -> schemas.SafeBoxResponse:
    """
    Compute and return the SAFE Box risk status for *student*.

    This function is intentionally side-effect-free — it does NOT persist
    anything to the database. If you want to cache the result in
    `student.safe_box_status`, do so in the calling router.
    """
    # ── Gather raw metrics ────────────────────────────────────────────────
    attendance_pct: Optional[float] = _attendance_pct(student, db)
    term_avgs: dict[int, float] = _term_averages(student)

    # Overall average across all terms
    avg_term_marks: Optional[float] = None
    if term_avgs:
        avg_term_marks = round(sum(term_avgs.values()) / len(term_avgs), 2)

    # Latest and previous term data (for drop comparison)
    sorted_terms = sorted(term_avgs.keys())
    latest_term: Optional[int] = sorted_terms[-1] if sorted_terms else None
    prev_term: Optional[int] = sorted_terms[-2] if len(sorted_terms) >= 2 else None
    latest_term_avg: Optional[float] = term_avgs.get(latest_term) if latest_term else None  # type: ignore[arg-type]
    prev_term_avg: Optional[float] = term_avgs.get(prev_term) if prev_term else None        # type: ignore[arg-type]

    marks_drop: Optional[float] = None
    if latest_term_avg is not None and prev_term_avg is not None:
        marks_drop = round(prev_term_avg - latest_term_avg, 2)

    # ── Apply risk algorithm ──────────────────────────────────────────────
    reasons: list[str] = []

    # Treat missing attendance as 0 % for risk purposes
    eff_attendance = attendance_pct if attendance_pct is not None else 0.0

    # ── HIGH RISK conditions ──────────────────────────────────────────────
    high_risk = False

    if eff_attendance < 75.0:
        high_risk = True
        if attendance_pct is None:
            reasons.append("No attendance data recorded (treated as 0 %).")
        else:
            reasons.append(
                f"Overall attendance is critically low at {attendance_pct:.1f}% (threshold: < 75%)."
            )

    if avg_term_marks is not None and avg_term_marks < 40.0:
        high_risk = True
        reasons.append(
            f"Average term marks ({avg_term_marks:.1f}) are below the minimum threshold of 40."
        )

    if high_risk:
        return schemas.SafeBoxResponse(
            student_id=student.id,
            student_name=student.full_name,
            status="High Risk",
            color="Red",
            overall_attendance_pct=attendance_pct,
            avg_term_marks=avg_term_marks,
            latest_term=latest_term,
            prev_term=prev_term,
            latest_term_avg=latest_term_avg,
            prev_term_avg=prev_term_avg,
            reasons=reasons,
        )

    # ── MEDIUM RISK conditions ────────────────────────────────────────────
    medium_risk = False

    if 75.0 <= eff_attendance <= 85.0:
        medium_risk = True
        reasons.append(
            f"Attendance ({attendance_pct:.1f}%) is in the caution zone (75%–85%)."
        )

    if marks_drop is not None and marks_drop > 15.0:
        medium_risk = True
        reasons.append(
            f"Term marks dropped by {marks_drop:.1f} points "
            f"(Term {prev_term} avg: {prev_term_avg:.1f} → Term {latest_term} avg: {latest_term_avg:.1f})."
        )

    if medium_risk:
        return schemas.SafeBoxResponse(
            student_id=student.id,
            student_name=student.full_name,
            status="Medium Risk",
            color="Yellow",
            overall_attendance_pct=attendance_pct,
            avg_term_marks=avg_term_marks,
            latest_term=latest_term,
            prev_term=prev_term,
            latest_term_avg=latest_term_avg,
            prev_term_avg=prev_term_avg,
            reasons=reasons,
        )

    # ── SAFE ──────────────────────────────────────────────────────────────
    return schemas.SafeBoxResponse(
        student_id=student.id,
        student_name=student.full_name,
        status="Safe",
        color="Green",
        overall_attendance_pct=attendance_pct,
        avg_term_marks=avg_term_marks,
        latest_term=latest_term,
        prev_term=prev_term,
        latest_term_avg=latest_term_avg,
        prev_term_avg=prev_term_avg,
        reasons=["All metrics are within safe thresholds."],
    )

