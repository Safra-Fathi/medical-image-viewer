from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from auth import get_current_user, create_audit_log
from database import get_db
from schemas import ReportCreate, ReportResponse
from models import AUDIT_GENERATE_REPORT


router = APIRouter(
    prefix="/api/reports",
    tags=["Reports"],
)


# ============================================================
# CREATE REPORT
# ============================================================

@router.post(
    "",
    response_model=ReportResponse,
)
def create_report(
    request: ReportCreate,
    user=Depends(get_current_user),
):

    connection = get_db()

    try:
        # Confirm that the study belongs to this user.
        study = connection.execute(
            """
            SELECT id
            FROM studies
            WHERE id = ?
              AND owner_id = ?
            """,
            (
                request.study_id,
                user["id"],
            ),
        ).fetchone()

        if study is None:
            raise HTTPException(
                status_code=404,
                detail="Study not found.",
            )

        report_text = request.report_text.strip()

        if not report_text:
            raise HTTPException(
                status_code=400,
                detail="Report text cannot be empty.",
            )

        cursor = connection.execute(
            """
            INSERT INTO reports (
                study_id,
                user_id,
                report_text,
                llm_provider
            )
            VALUES (?, ?, ?, ?)
            """,
            (
                request.study_id,
                user["id"],
                report_text,
                request.llm_provider,
            ),
        )

        report_id = cursor.lastrowid

        connection.execute(
            """
            UPDATE studies
            SET status = 'reported'
            WHERE id = ?
              AND owner_id = ?
            """,
            (
                request.study_id,
                user["id"],
            ),
        )

        connection.commit()

        report = connection.execute(
            """
            SELECT *
            FROM reports
            WHERE id = ?
              AND user_id = ?
            """,
            (
                report_id,
                user["id"],
            ),
        ).fetchone()

    finally:
        connection.close()

    create_audit_log(
        action=AUDIT_GENERATE_REPORT,
        user_id=user["id"],
        resource_type="report",
        resource_id=str(report_id),
    )

    return dict(report)


# ============================================================
# LIST MY REPORTS
# ============================================================

@router.get(
    "",
    response_model=list[ReportResponse],
)
def list_reports(
    user=Depends(get_current_user),
):

    connection = get_db()

    try:
        rows = connection.execute(
            """
            SELECT *
            FROM reports
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (user["id"],),
        ).fetchall()

        return [dict(row) for row in rows]

    finally:
        connection.close()


# ============================================================
# GET SINGLE REPORT
# ============================================================

@router.get(
    "/{report_id}",
    response_model=ReportResponse,
)
def get_report(
    report_id: int,
    user=Depends(get_current_user),
):

    connection = get_db()

    try:
        report = connection.execute(
            """
            SELECT *
            FROM reports
            WHERE id = ?
              AND user_id = ?
            """,
            (
                report_id,
                user["id"],
            ),
        ).fetchone()

    finally:
        connection.close()

    if report is None:
        raise HTTPException(
            status_code=404,
            detail="Report not found.",
        )

    return dict(report)


# ============================================================
# REPORTS FOR A STUDY
# ============================================================

@router.get(
    "/study/{study_id}",
    response_model=list[ReportResponse],
)
def get_study_reports(
    study_id: int,
    user=Depends(get_current_user),
):

    connection = get_db()

    try:
        study = connection.execute(
            """
            SELECT id
            FROM studies
            WHERE id = ?
              AND owner_id = ?
            """,
            (
                study_id,
                user["id"],
            ),
        ).fetchone()

        if study is None:
            raise HTTPException(
                status_code=404,
                detail="Study not found.",
            )

        rows = connection.execute(
            """
            SELECT *
            FROM reports
            WHERE study_id = ?
              AND user_id = ?
            ORDER BY id DESC
            """,
            (
                study_id,
                user["id"],
            ),
        ).fetchall()

        return [dict(row) for row in rows]

    finally:
        connection.close()


# ============================================================
# DELETE REPORT
# ============================================================

@router.delete("/{report_id}")
def delete_report(
    report_id: int,
    user=Depends(get_current_user),
):

    connection = get_db()

    try:
        report = connection.execute(
            """
            SELECT id
            FROM reports
            WHERE id = ?
              AND user_id = ?
            """,
            (
                report_id,
                user["id"],
            ),
        ).fetchone()

        if report is None:
            raise HTTPException(
                status_code=404,
                detail="Report not found.",
            )

        connection.execute(
            """
            DELETE FROM reports
            WHERE id = ?
              AND user_id = ?
            """,
            (
                report_id,
                user["id"],
            ),
        )

        connection.commit()

    finally:
        connection.close()

    return {
        "success": True,
        "message": "Report deleted successfully.",
    }