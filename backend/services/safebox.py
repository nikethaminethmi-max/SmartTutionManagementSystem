"""
SAFE Box Risk Calculation Engine
=================================
Pure business logic — no FastAPI or DB imports.
Pass in pre-fetched lists of attendance records and term marks.

Algorithm (priority order — first match wins):
─────────────────────────────────────────────────────────────────
HIGH RISK  (Red)    : attendance < 75%  OR  avg marks < 40
MEDIUM RISK(Yellow) : attendance 75–85% OR  marks dropped > 15pts
                      compared to the previous term's average
SAFE       (Green)  : attendance > 85%  AND avg marks >= 50
─────────────────────────────────────────────────────────────────

Notes:
- If a student has NO attendance records yet → treated as 100% (new student).
- If a student has NO marks yet → marks checks are skipped.
- Term-drop check: averages all subjects per term, then compares
  the latest two terms.  Dropped means current_avg < previous_avg - 15.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal


# ── Types ────────────────────────────────────────────────────────────────────

RiskLevel = Literal["High Risk", "Medium Risk", "Safe"]

RED    = "High Risk"
YELLOW = "Medium Risk"
GREEN  = "Safe"


# ── Data containers (keep it plain — no ORM dependency) ──────────────────────

@dataclass
class AttendanceRecord:
    status: str   # "Present" | "Absent"


@dataclass
class MarkRecord:
    term_number: int
    marks: float


# ── Core calculation ─────────────────────────────────────────────────────────

def calculate_attendance_pct(records: list[AttendanceRecord]) -> float:
    """Return attendance percentage (0–100).  Empty → 100.0 (new student)."""
    if not records:
        return 100.0
    present = sum(1 for r in records if r.status == "Present")
    return (present / len(records)) * 100


def calculate_avg_marks(marks: list[MarkRecord]) -> float | None:
    """Return overall average marks, or None if no marks exist."""
    if not marks:
        return None
    return sum(m.marks for m in marks) / len(marks)


def calculate_term_drop(marks: list[MarkRecord]) -> float | None:
    """
    Return the drop (positive = decrease) from the second-latest to the
    latest term average.  Returns None if fewer than 2 terms exist.
    """
    if not marks:
        return None

    # Group by term number
    by_term: dict[int, list[float]] = {}
    for m in marks:
        by_term.setdefault(m.term_number, []).append(m.marks)

    if len(by_term) < 2:
        return None

    sorted_terms = sorted(by_term.keys())
    prev_term = sorted_terms[-2]
    curr_term = sorted_terms[-1]

    prev_avg = sum(by_term[prev_term]) / len(by_term[prev_term])
    curr_avg = sum(by_term[curr_term]) / len(by_term[curr_term])

    return prev_avg - curr_avg   # positive = dropped


# ── Main entry point ─────────────────────────────────────────────────────────

@dataclass
class SafeBoxResult:
    status: RiskLevel
    attendance_pct: float
    avg_marks: float | None
    term_drop: float | None          # None if < 2 terms; positive = drop
    reason: str                      # Human-readable explanation for the UI


def compute_safebox(
    attendance: list[AttendanceRecord],
    marks: list[MarkRecord],
) -> SafeBoxResult:
    """
    Apply the SAFE Box algorithm and return a SafeBoxResult.

    Priority order:
      1. HIGH RISK  if attendance < 75% OR avg_marks < 40
      2. MEDIUM RISK if attendance in [75, 85] OR term_drop > 15
      3. SAFE       otherwise
    """
    att_pct    = calculate_attendance_pct(attendance)
    avg_marks  = calculate_avg_marks(marks)
    term_drop  = calculate_term_drop(marks)

    # ── HIGH RISK ────────────────────────────────────────────────────────────
    if att_pct < 75:
        return SafeBoxResult(
            status=RED,
            attendance_pct=round(att_pct, 1),
            avg_marks=round(avg_marks, 1) if avg_marks is not None else None,
            term_drop=round(term_drop, 1) if term_drop is not None else None,
            reason=f"Attendance is critically low at {att_pct:.1f}% (minimum 75% required).",
        )

    if avg_marks is not None and avg_marks < 40:
        return SafeBoxResult(
            status=RED,
            attendance_pct=round(att_pct, 1),
            avg_marks=round(avg_marks, 1),
            term_drop=round(term_drop, 1) if term_drop is not None else None,
            reason=f"Average marks are critically low at {avg_marks:.1f}% (minimum 40 required).",
        )

    # ── MEDIUM RISK ──────────────────────────────────────────────────────────
    if 75 <= att_pct <= 85:
        return SafeBoxResult(
            status=YELLOW,
            attendance_pct=round(att_pct, 1),
            avg_marks=round(avg_marks, 1) if avg_marks is not None else None,
            term_drop=round(term_drop, 1) if term_drop is not None else None,
            reason=f"Attendance is borderline at {att_pct:.1f}% (target: above 85%).",
        )

    if term_drop is not None and term_drop > 15:
        return SafeBoxResult(
            status=YELLOW,
            attendance_pct=round(att_pct, 1),
            avg_marks=round(avg_marks, 1) if avg_marks is not None else None,
            term_drop=round(term_drop, 1),
            reason=f"Marks dropped by {term_drop:.1f} points compared to the previous term.",
        )

    # ── SAFE ─────────────────────────────────────────────────────────────────
    return SafeBoxResult(
        status=GREEN,
        attendance_pct=round(att_pct, 1),
        avg_marks=round(avg_marks, 1) if avg_marks is not None else None,
        term_drop=round(term_drop, 1) if term_drop is not None else None,
        reason="Attendance and academic performance are on track. Keep it up!",
    )
