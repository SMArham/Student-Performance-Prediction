"""
FastAPI Main Application Entrypoint
Student Performance Prediction & Analytics System
"""

import time
import os
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, RedirectResponse

from backend.app.config import settings
from backend.app.core.logger import logger
from backend.app.core.exceptions import (
    AppException,
    app_exception_handler,
    generic_exception_handler,
)
from backend.app.routes import dashboard, predictions, history, models_registry, students, academic_records
from backend.app.services.ml_service import ml_service


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle event handler for application startup and shutdown."""
    logger.info("========================================================")
    logger.info("  Student Performance Prediction & Analytics System API ")
    logger.info(f"  Environment: {settings.ENVIRONMENT}")
    logger.info(f"  Active ML Artifacts Dir: {settings.ML_ARTIFACTS_DIR}")
    logger.info(f"  Loaded Stages: {list(ml_service.models.keys())}")
    logger.info("========================================================")
    yield
    logger.info("Shutting down Student Performance API service...")


# Initialize FastAPI app with Swagger and ReDoc documentation explicitly disabled
app = FastAPI(
    title="Student Performance Prediction & Analytics API",
    description="Multi-Stage Machine Learning Engine & Analytics System",
    version="2.0.0",
    lifespan=lifespan,
    docs_url=None,       # Swagger UI disabled as requested
    redoc_url=None,      # ReDoc disabled as requested
    openapi_url=None,    # OpenAPI JSON disabled
)

# ------------------------------------------------------------------------------
# 1. Production-Grade CORS Configuration
# ------------------------------------------------------------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ------------------------------------------------------------------------------
# 2. Request Timing & Logging Middleware
# ------------------------------------------------------------------------------
@app.middleware("http")
async def log_requests_middleware(request: Request, call_next):
    start_time = time.time()
    response = await call_next(request)
    duration_ms = round((time.time() - start_time) * 1000, 2)
    logger.info(
        f"{request.method} {request.url.path} -> {response.status_code} ({duration_ms}ms)"
    )
    return response


# ------------------------------------------------------------------------------
# 3. Centralized Exception Handlers
# ------------------------------------------------------------------------------
app.add_exception_handler(AppException, app_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)


# ------------------------------------------------------------------------------
# 4. API Route Registrations
# ------------------------------------------------------------------------------
app.include_router(dashboard.router)
app.include_router(predictions.router)
app.include_router(history.router)
app.include_router(models_registry.router)
app.include_router(students.router)
app.include_router(academic_records.router)


# ------------------------------------------------------------------------------
# 5. Robust Static Frontend & HTML Route Serving
# ------------------------------------------------------------------------------
FRONTEND_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend"))
if not os.path.exists(FRONTEND_DIR):
    FRONTEND_DIR = os.path.abspath("frontend")

if os.path.exists(FRONTEND_DIR):
    # Direct HTML file endpoints for seamless navigation across all 3 pages
    @app.get("/login", include_in_schema=False)
    @app.get("/login.html", include_in_schema=False)
    async def serve_login():
        login_file = os.path.join(FRONTEND_DIR, "login.html")
        if os.path.exists(login_file):
            return FileResponse(login_file, media_type="text/html")
        return RedirectResponse(url="/")

    @app.get("/signup", include_in_schema=False)
    @app.get("/signup.html", include_in_schema=False)
    async def serve_signup():
        signup_file = os.path.join(FRONTEND_DIR, "signup.html")
        if os.path.exists(signup_file):
            return FileResponse(signup_file, media_type="text/html")
        return RedirectResponse(url="/")

    @app.get("/dashboard", include_in_schema=False)
    @app.get("/dashboard.html", include_in_schema=False)
    async def serve_dashboard():
        dash_file = os.path.join(FRONTEND_DIR, "dashboard.html")
        if os.path.exists(dash_file):
            return FileResponse(dash_file, media_type="text/html")
        return RedirectResponse(url="/")

    @app.get("/prediction", include_in_schema=False)
    @app.get("/prediction.html", include_in_schema=False)
    async def serve_prediction():
        pred_file = os.path.join(FRONTEND_DIR, "prediction.html")
        if os.path.exists(pred_file):
            return FileResponse(pred_file, media_type="text/html")
        return RedirectResponse(url="/")

    @app.get("/analytics", include_in_schema=False)
    @app.get("/analytics.html", include_in_schema=False)
    async def serve_analytics():
        analytics_file = os.path.join(FRONTEND_DIR, "analytics.html")
        if os.path.exists(analytics_file):
            return FileResponse(analytics_file, media_type="text/html")
        return RedirectResponse(url="/")

    @app.get("/teacher-dashboard", include_in_schema=False)
    @app.get("/teacher-dashboard.html", include_in_schema=False)
    async def serve_teacher_dashboard():
        dash_file = os.path.join(FRONTEND_DIR, "teacher-dashboard.html")
        if os.path.exists(dash_file):
            return FileResponse(dash_file, media_type="text/html")
        return RedirectResponse(url="/")

    @app.get("/teacher-prediction", include_in_schema=False)
    @app.get("/teacher-prediction.html", include_in_schema=False)
    async def serve_teacher_prediction():
        pred_file = os.path.join(FRONTEND_DIR, "teacher-prediction.html")
        if os.path.exists(pred_file):
            return FileResponse(pred_file, media_type="text/html")
        return RedirectResponse(url="/")

    @app.get("/teacher-analytics", include_in_schema=False)
    @app.get("/teacher-analytics.html", include_in_schema=False)
    async def serve_teacher_analytics():
        analytics_file = os.path.join(FRONTEND_DIR, "teacher-analytics.html")
        if os.path.exists(analytics_file):
            return FileResponse(analytics_file, media_type="text/html")
        return RedirectResponse(url="/")

    @app.get("/index.html", include_in_schema=False)
    async def serve_index_html():
        idx_file = os.path.join(FRONTEND_DIR, "index.html")
        if os.path.exists(idx_file):
            return FileResponse(idx_file, media_type="text/html")
        return RedirectResponse(url="/login.html")

    # Mount static assets directory and root catch-all
    app.mount("/", StaticFiles(directory=FRONTEND_DIR, html=True), name="frontend")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("backend.app.main:app", host=settings.APP_HOST, port=settings.APP_PORT, reload=True)
