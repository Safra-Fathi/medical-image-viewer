import json

from fastapi import (
    APIRouter,
    Depends,
    File,
    Form,
    HTTPException,
    UploadFile,
)

from auth import get_current_user, create_audit_log
from database import get_db
from models import AUDIT_RUN_AI_ANALYSIS

from schemas import ExplanationRequest
from models import AI_DISCLAIMER

from services.groq_service import generate_groq_explanation
from services.ollama_service import generate_ollama_explanation


from services.segmentation import (
    segment_image,
    is_model_loaded,
    get_model_status,
)


router = APIRouter(
    prefix="/api",
    tags=["AI Analysis"],
)

MAX_UPLOAD_SIZE = 20 * 1024 * 1024


# ============================================================
# MODEL STATUS
# ============================================================

@router.get("/model/status")
def model_status(
    user=Depends(get_current_user),
):
    return get_model_status()


# ============================================================
# SEGMENT IMAGE
# ============================================================

@router.post("/segment")
async def run_segmentation(
    file: UploadFile = File(...),
    study_id: int | None = Form(default=None),
    user=Depends(get_current_user),
):

    if not is_model_loaded():
        raise HTTPException(
            status_code=503,
            detail="Segmentation model is unavailable.",
        )

    # Validate ownership before processing the image.
    if study_id is not None:

        connection = get_db()

        try:
            study = connection.execute(
                """
                SELECT id
                FROM studies
                WHERE id = ?
                  AND owner_id = ?
                """,
                (study_id, user["id"]),
            ).fetchone()

        finally:
            connection.close()

        if study is None:
            raise HTTPException(
                status_code=404,
                detail="Study not found.",
            )

    # Read a bounded amount rather than accepting unlimited uploads.
    image_bytes = await file.read(
        MAX_UPLOAD_SIZE + 1
    )

    if not image_bytes:
        raise HTTPException(
            status_code=400,
            detail="The uploaded file is empty.",
        )

    if len(image_bytes) > MAX_UPLOAD_SIZE:
        raise HTTPException(
            status_code=413,
            detail="The uploaded file exceeds the 20 MB limit.",
        )

    try:
        result = segment_image(image_bytes)

    except Exception:
        raise HTTPException(
            status_code=422,
            detail=(
                "The image could not be processed. "
                "Please check the file format and model compatibility."
            ),
        )

    # Save numerical results, not the base64 mask.
    result_metadata = {
        "tumor_pixels": result["tumor_pixels"],
        "tumor_percentage": result["tumor_percentage"],
        "threshold": result["threshold"],
        "model_name": result["model_name"],
        "model_version": result["model_version"],
        "processing_time_ms": result["processing_time_ms"],
    }

    connection = get_db()

    try:
        cursor = connection.execute(
            """
            INSERT INTO ai_analyses (
                study_id,
                user_id,
                model_name,
                model_version,
                tumor_pixels,
                tumor_percentage,
                threshold,
                result_json,
                processing_time_ms
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                study_id,
                user["id"],
                result["model_name"],
                result["model_version"],
                result["tumor_pixels"],
                result["tumor_percentage"],
                result["threshold"],
                json.dumps(result_metadata),
                result["processing_time_ms"],
            ),
        )

        analysis_id = cursor.lastrowid

        if study_id is not None:
            connection.execute(
                """
                UPDATE studies
                SET status = 'analyzed'
                WHERE id = ?
                  AND owner_id = ?
                """,
                (study_id, user["id"]),
            )

        connection.commit()

    finally:
        connection.close()

    create_audit_log(
        action=AUDIT_RUN_AI_ANALYSIS,
        user_id=user["id"],
        resource_type="analysis",
        resource_id=str(analysis_id),
    )

    return {
        **result,
        "analysis_id": analysis_id,
        "study_id": study_id,
    }


# ============================================================
# ANALYSIS HISTORY
# ============================================================

@router.get("/analyses")
def list_analyses(
    user=Depends(get_current_user),
):

    connection = get_db()

    try:
        rows = connection.execute(
            """
            SELECT
                id,
                study_id,
                user_id,
                model_name,
                model_version,
                tumor_pixels,
                tumor_percentage,
                threshold,
                result_json,
                processing_time_ms,
                created_at
            FROM ai_analyses
            WHERE user_id = ?
            ORDER BY id DESC
            """,
            (user["id"],),
        ).fetchall()

        return [dict(row) for row in rows]

    finally:
        connection.close()


# ============================================================
# SINGLE ANALYSIS
# ============================================================

@router.get("/analyses/{analysis_id}")
def get_analysis(
    analysis_id: int,
    user=Depends(get_current_user),
):

    connection = get_db()

    try:
        row = connection.execute(
            """
            SELECT *
            FROM ai_analyses
            WHERE id = ?
              AND user_id = ?
            """,
            (analysis_id, user["id"]),
        ).fetchone()

    finally:
        connection.close()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found.",
        )

    return dict(row)

@router.post("/explain")
def explain_analysis(
    request: ExplanationRequest,
    user=Depends(get_current_user),
):
    connection = get_db()

    try:
        row = connection.execute(
            """
            SELECT *
            FROM ai_analyses
            WHERE id = ?
              AND user_id = ?
            """,
            (
                request.analysis_id,
                user["id"],
            ),
        ).fetchone()

    finally:
        connection.close()

    if row is None:
        raise HTTPException(
            status_code=404,
            detail="Analysis not found.",
        )

    analysis = dict(row)

    if request.provider == "groq":
        result = generate_groq_explanation(
            analysis=analysis,
            style=request.style,
        )

    elif request.provider == "ollama":
        result = generate_ollama_explanation(
            analysis=analysis,
            style=request.style,
        )

    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported LLM provider.",
        )

    return result