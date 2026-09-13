from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
)

from pydantic import BaseModel, Field

from auth import (
    get_current_user,
    create_audit_log,
)

from database import get_db

from schemas import (
    StudyCreate,
    StudyResponse,
)

from models import (
    AUDIT_CREATE_STUDY,
    AUDIT_OPEN_STUDY,
    AUDIT_DELETE_STUDY,
)


# ============================================================
# ROUTER
# ============================================================

router = APIRouter(
    prefix="/api/studies",
    tags=["Studies"],
)


# ============================================================
# UPDATE SCHEMA
# ============================================================

class StudyUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200,
    )

    patient_id: str | None = None
    modality: str | None = None
    study_instance_uid: str | None = None
    description: str | None = None


# ============================================================
# CREATE STUDY
# ============================================================

@router.post(
    "",
    response_model=StudyResponse,
)
def create_study(
    request: StudyCreate,
    user=Depends(get_current_user),
):

    connection = get_db()

    try:

        cursor = connection.execute(
            """
            INSERT INTO studies (
                owner_id,
                title,
                patient_id,
                modality,
                study_instance_uid,
                description,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                user["id"],
                request.title.strip(),
                request.patient_id,
                request.modality,
                request.study_instance_uid,
                request.description,
                "pending",
            ),
        )

        study_id = cursor.lastrowid

        connection.commit()

        study = connection.execute(
            """
            SELECT *
            FROM studies
            WHERE id = ?
              AND owner_id = ?
            """,
            (
                study_id,
                user["id"],
            ),
        ).fetchone()

    finally:
        connection.close()

    create_audit_log(
        action=AUDIT_CREATE_STUDY,
        user_id=user["id"],
        resource_type="study",
        resource_id=str(study_id),
    )

    return dict(study)


# ============================================================
# LIST MY STUDIES
# ============================================================

@router.get(
    "",
    response_model=list[StudyResponse],
)
def list_studies(
    user=Depends(get_current_user),
):

    connection = get_db()

    try:

        rows = connection.execute(
            """
            SELECT *
            FROM studies
            WHERE owner_id = ?
            ORDER BY id DESC
            """,
            (user["id"],),
        ).fetchall()

        return [
            dict(row)
            for row in rows
        ]

    finally:
        connection.close()


# ============================================================
# GET SINGLE STUDY
# ============================================================

@router.get(
    "/{study_id}",
    response_model=StudyResponse,
)
def get_study(
    study_id: int,
    user=Depends(get_current_user),
):

    connection = get_db()

    try:

        study = connection.execute(
            """
            SELECT *
            FROM studies
            WHERE id = ?
              AND owner_id = ?
            """,
            (
                study_id,
                user["id"],
            ),
        ).fetchone()

    finally:
        connection.close()

    if study is None:

        raise HTTPException(
            status_code=404,
            detail="Study not found.",
        )

    create_audit_log(
        action=AUDIT_OPEN_STUDY,
        user_id=user["id"],
        resource_type="study",
        resource_id=str(study_id),
    )

    return dict(study)


# ============================================================
# UPDATE STUDY
# ============================================================

@router.patch(
    "/{study_id}",
    response_model=StudyResponse,
)
def update_study(
    study_id: int,
    request: StudyUpdate,
    user=Depends(get_current_user),
):

    updates = request.model_dump(
        exclude_unset=True
    )

    if not updates:

        raise HTTPException(
            status_code=400,
            detail="No fields provided for update.",
        )

    if (
        "title" in updates
        and updates["title"] is not None
    ):

        updates["title"] = (
            updates["title"].strip()
        )

        if not updates["title"]:

            raise HTTPException(
                status_code=400,
                detail="Title cannot be empty.",
            )

    allowed_fields = {
        "title",
        "patient_id",
        "modality",
        "study_instance_uid",
        "description",
    }

    updates = {
        key: value
        for key, value in updates.items()
        if key in allowed_fields
    }

    connection = get_db()

    try:

        existing = connection.execute(
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

        if existing is None:

            raise HTTPException(
                status_code=404,
                detail="Study not found.",
            )

        set_clause = ", ".join(
            f"{field} = ?"
            for field in updates
        )

        values = list(
            updates.values()
        )

        connection.execute(
            f"""
            UPDATE studies
            SET {set_clause}
            WHERE id = ?
              AND owner_id = ?
            """,
            (
                *values,
                study_id,
                user["id"],
            ),
        )

        connection.commit()

        study = connection.execute(
            """
            SELECT *
            FROM studies
            WHERE id = ?
              AND owner_id = ?
            """,
            (
                study_id,
                user["id"],
            ),
        ).fetchone()

    finally:
        connection.close()

    return dict(study)


# ============================================================
# DELETE STUDY
# ============================================================

@router.delete(
    "/{study_id}"
)
def delete_study(
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

        connection.execute(
            """
            DELETE FROM studies
            WHERE id = ?
              AND owner_id = ?
            """,
            (
                study_id,
                user["id"],
            ),
        )

        connection.commit()

    finally:
        connection.close()

    create_audit_log(
        action=AUDIT_DELETE_STUDY,
        user_id=user["id"],
        resource_type="study",
        resource_id=str(study_id),
    )

    return {
        "success": True,
        "message": "Study deleted successfully.",
    }