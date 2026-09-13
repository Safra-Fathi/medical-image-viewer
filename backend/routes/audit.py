from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
)

from auth import get_current_user
from database import get_db
from schemas import AuditLogResponse


router = APIRouter(
    prefix="/api/audit",
    tags=["Audit Logs"],
)


# ============================================================
# LIST MY AUDIT LOGS
# ============================================================

@router.get(
    "",
    response_model=list[AuditLogResponse],
)
def list_audit_logs(
    limit: int = Query(
        default=50,
        ge=1,
        le=200,
    ),
    offset: int = Query(
        default=0,
        ge=0,
    ),
    user=Depends(get_current_user),
):

    connection = get_db()

    try:
        rows = connection.execute(
            """
            SELECT
                id,
                user_id,
                action,
                resource_type,
                resource_id,
                details,
                created_at
            FROM audit_logs
            WHERE user_id = ?
            ORDER BY id DESC
            LIMIT ? OFFSET ?
            """,
            (
                user["id"],
                limit,
                offset,
            ),
        ).fetchall()

        return [dict(row) for row in rows]

    finally:
        connection.close()


# ============================================================
# GET SINGLE AUDIT LOG
# ============================================================

@router.get(
    "/{audit_id}",
    response_model=AuditLogResponse,
)
def get_audit_log(
    audit_id: int,
    user=Depends(get_current_user),
):

    connection = get_db()

    try:
        log = connection.execute(
            """
            SELECT
                id,
                user_id,
                action,
                resource_type,
                resource_id,
                details,
                created_at
            FROM audit_logs
            WHERE id = ?
              AND user_id = ?
            """,
            (
                audit_id,
                user["id"],
            ),
        ).fetchone()

    finally:
        connection.close()

    if log is None:
        raise HTTPException(
            status_code=404,
            detail="Audit log not found.",
        )

    return dict(log)