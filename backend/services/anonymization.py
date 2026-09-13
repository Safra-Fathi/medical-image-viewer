import hashlib
import io
import secrets

from typing import Any

import pydicom

from pydicom.dataset import Dataset
from pydicom.uid import generate_uid


# ============================================================
# CONFIGURATION
# ============================================================

# Only these metadata fields may be included in the
# restricted LLM payload.
ALLOWED_LLM_FIELDS = {
    "modality",
    "image_width",
    "image_height",
    "model_name",
    "model_version",
    "tumor_pixels",
    "tumor_percentage",
    "threshold",
}


# ============================================================
# DICOM METADATA SUMMARY
# ============================================================

def get_dicom_metadata(
    dicom_bytes: bytes,
) -> dict[str, Any]:

    dataset = pydicom.dcmread(
        io.BytesIO(dicom_bytes),
        stop_before_pixels=True,
    )

    return {
        "modality": str(
            dataset.get("Modality", "")
        ),
        "image_width": int(
            dataset.get("Columns", 0)
        ),
        "image_height": int(
            dataset.get("Rows", 0)
        ),
        "number_of_frames": int(
            dataset.get("NumberOfFrames", 1)
        ),
    }


# ============================================================
# DICOM DE-IDENTIFICATION
# ============================================================

def deidentify_dicom(
    dicom_bytes: bytes,
) -> bytes:

    dataset = pydicom.dcmread(
        io.BytesIO(dicom_bytes)
    )

    # Remove private attributes.
    dataset.remove_private_tags()

    # Remove common direct identifiers.
    identifying_fields = [
        "PatientName",
        "PatientID",
        "PatientBirthDate",
        "PatientBirthTime",
        "PatientAddress",
        "PatientTelephoneNumbers",
        "OtherPatientIDs",
        "OtherPatientNames",
        "PatientComments",
        "InstitutionName",
        "InstitutionAddress",
        "ReferringPhysicianName",
        "PerformingPhysicianName",
        "OperatorsName",
        "AccessionNumber",
        "StudyID",
    ]

    for field in identifying_fields:

        if field in dataset:
            del dataset[field]

    # Replace selected identifiers with newly generated UIDs.
    # This is a simplified demonstration and does not preserve
    # cross-file UID relationships for a complete DICOM series.
    for field in [
        "StudyInstanceUID",
        "SeriesInstanceUID",
        "SOPInstanceUID",
    ]:

        if field in dataset:
            dataset[field].value = generate_uid()

    # Indicate that identifying information has been removed.
    # This flag alone does not establish full de-identification.
    dataset.PatientIdentityRemoved = "YES"

    dataset.DeidentificationMethod = (
        "Demonstration metadata de-identification"
    )

    output = io.BytesIO()

    dataset.save_as(
        output,
        write_like_original=False,
    )

    return output.getvalue()


# ============================================================
# RESTRICTED LLM PAYLOAD
# ============================================================

def build_llm_payload(
    analysis: dict[str, Any],
    metadata: dict[str, Any] | None = None,
) -> dict[str, Any]:

    """
    Build a restricted payload containing only approved
    numerical/model fields.

    Patient names, IDs, dates, free-text descriptions,
    image bytes, and DICOM metadata are not included.
    """

    source = {
        **(metadata or {}),
        **analysis,
    }

    payload = {
        key: source[key]
        for key in ALLOWED_LLM_FIELDS
        if key in source
    }

    return payload