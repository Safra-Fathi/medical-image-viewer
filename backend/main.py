from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import init_database

from routes.auth import router as auth_router
from routes.studies import router as studies_router
from routes.analysis import router as analysis_router
from routes.reports import router as reports_router
from routes.audit import router as audit_router

from services.segmentation import (
    is_model_loaded,
    load_segmentation_model,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_database()
    load_segmentation_model()
    yield


app = FastAPI(
    title="MedVision AI API",
    version="2.0.0",
    description="AI-assisted medical imaging research platform",
    lifespan=lifespan,
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(studies_router)
app.include_router(analysis_router)
app.include_router(reports_router)
app.include_router(audit_router)


@app.get("/")
def root():
    return {
        "message": "MedVision AI Backend is running",
        "version": "2.0.0",
    }


@app.get("/api/health")
def health():
    return {
        "status": "healthy",
        "service": "medical-viewer-backend",
        "model_loaded": is_model_loaded(),
    }