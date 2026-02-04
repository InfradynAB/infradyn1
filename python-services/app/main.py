"""
Infradyn Python Services - FastAPI Application
AI Extraction, KPI Engine, Report Generation
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager

from app.config import get_settings
from app.routers import extraction, health


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    print("🚀 Infradyn Python Services starting...")
    yield
    # Shutdown
    print("👋 Infradyn Python Services shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Infradyn Python Services",
    description="AI extraction, KPI calculations, and report generation for Infradyn",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# Configure CORS
settings = get_settings()
origins = settings.allowed_origins.split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["Health"])
app.include_router(extraction.router, prefix="/api/extraction", tags=["AI Extraction"])


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "Infradyn Python Services",
        "version": "1.0.0",
        "status": "operational",
        "docs": "/docs"
    }
