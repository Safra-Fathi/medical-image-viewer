from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field


# ============================================================
# AUTHENTICATION
# ============================================================

class RegisterRequest(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: str = Field(min_length=3, max_length=254)
    password: str = Field(min_length=12)


class LoginRequest(BaseModel):
    email: str
    password: str


class UserResponse(BaseModel):
    id: int
    name: str
    email: str


class AuthResponse(BaseModel):
    success: bool
    message: str
    user: UserResponse
    token: str


# ============================================================
# STUDIES
# ============================================================

class StudyCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    patient_id: str | None = None
    modality: str | None = None
    study_instance_uid: str | None = None
    description: str | None = None


class StudyResponse(BaseModel):
    id: int
    owner_id: int
    title: str
    patient_id: str | None = None
    modality: str | None = None
    study_instance_uid: str | None = None
    description: str | None = None
    status: str
    created_at: str


# ============================================================
# AI ANALYSIS
# ============================================================

class AnalysisResponse(BaseModel):
    success: bool
    mask: str | None = None

    tumor_pixels: int
    tumor_percentage: float
    threshold: float

    model_name: str
    model_version: str | None = None
    processing_time_ms: float | None = None

    message: str


class AnalysisRecord(BaseModel):
    id: int
    study_id: int | None = None
    user_id: int

    model_name: str
    model_version: str | None = None

    tumor_pixels: int | None = None
    tumor_percentage: float | None = None
    threshold: float | None = None

    result_json: str | None = None
    processing_time_ms: float | None = None
    created_at: str


# ============================================================
# REPORTS
# ============================================================

class ReportCreate(BaseModel):
    study_id: int
    report_text: str = Field(min_length=1)
    llm_provider: str | None = None


class ReportResponse(BaseModel):
    id: int
    study_id: int
    user_id: int
    report_text: str
    llm_provider: str | None = None
    created_at: str


# ============================================================
# LLM EXPLANATION
# ============================================================

class ExplanationRequest(BaseModel):
    analysis_id: int
    provider: Literal["groq", "ollama"] = "ollama"
    style: Literal["technical", "simple", "report"] = "technical"


class ExplanationResponse(BaseModel):
    success: bool
    provider: str
    explanation: str
    disclaimer: str


# ============================================================
# SETTINGS
# ============================================================

class SettingsUpdate(BaseModel):
    llm_provider: Literal["groq", "ollama"] = "ollama"
    privacy_mode: bool = True


class SettingsResponse(BaseModel):
    user_id: int
    llm_provider: str
    privacy_mode: bool


# ============================================================
# AUDIT LOGS
# ============================================================

class AuditLogResponse(BaseModel):
    id: int
    user_id: int | None = None
    action: str
    resource_type: str | None = None
    resource_id: str | None = None
    details: str | None = None
    created_at: str