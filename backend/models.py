# ============================================================
# USER ROLES
# ============================================================

ROLE_ADMIN = "admin"
ROLE_RADIOLOGIST = "radiologist"
ROLE_CLINICIAN = "clinician"


VALID_USER_ROLES = {
    ROLE_ADMIN,
    ROLE_RADIOLOGIST,
    ROLE_CLINICIAN,
}


# ============================================================
# STUDY STATUS
# ============================================================

STUDY_STATUS_PENDING = "pending"
STUDY_STATUS_UPLOADED = "uploaded"
STUDY_STATUS_ANALYZED = "analyzed"
STUDY_STATUS_REPORTED = "reported"


VALID_STUDY_STATUSES = {
    STUDY_STATUS_PENDING,
    STUDY_STATUS_UPLOADED,
    STUDY_STATUS_ANALYZED,
    STUDY_STATUS_REPORTED,
}


# ============================================================
# MEDICAL IMAGE MODALITIES
# ============================================================

MODALITY_MRI = "MRI"
MODALITY_CT = "CT"
MODALITY_XRAY = "XRAY"
MODALITY_DICOM = "DICOM"
MODALITY_NIFTI = "NIFTI"
MODALITY_TIFF = "TIFF"
MODALITY_IMAGE = "IMAGE"


VALID_MODALITIES = {
    MODALITY_MRI,
    MODALITY_CT,
    MODALITY_XRAY,
    MODALITY_DICOM,
    MODALITY_NIFTI,
    MODALITY_TIFF,
    MODALITY_IMAGE,
}


# ============================================================
# AI MODELS
# ============================================================

DEFAULT_SEGMENTATION_MODEL = (
    "brain_tumor_unet"
)

DEFAULT_SEGMENTATION_MODEL_VERSION = (
    "1.0"
)


# ============================================================
# LLM PROVIDERS
# ============================================================

LLM_PROVIDER_GROQ = "groq"
LLM_PROVIDER_OLLAMA = "ollama"


VALID_LLM_PROVIDERS = {
    LLM_PROVIDER_GROQ,
    LLM_PROVIDER_OLLAMA,
}


# ============================================================
# AUDIT ACTIONS
# ============================================================

AUDIT_REGISTER = "REGISTER"
AUDIT_LOGIN = "LOGIN"
AUDIT_LOGOUT = "LOGOUT"

AUDIT_CREATE_STUDY = "CREATE_STUDY"
AUDIT_OPEN_STUDY = "OPEN_STUDY"
AUDIT_DELETE_STUDY = "DELETE_STUDY"

AUDIT_UPLOAD_IMAGE = "UPLOAD_IMAGE"

AUDIT_RUN_AI_ANALYSIS = (
    "RUN_AI_ANALYSIS"
)

AUDIT_GENERATE_REPORT = (
    "GENERATE_REPORT"
)

AUDIT_DOWNLOAD_REPORT = (
    "DOWNLOAD_REPORT"
)

AUDIT_UPDATE_SETTINGS = (
    "UPDATE_SETTINGS"
)


# ============================================================
# AI DISCLAIMER
# ============================================================

AI_DISCLAIMER = (
    "AI-assisted analysis for research and "
    "demonstration purposes only. Results should "
    "not be used as a substitute for review by a "
    "qualified healthcare professional."
)