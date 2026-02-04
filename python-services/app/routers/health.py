"""
Health check router
"""
from fastapi import APIRouter

router = APIRouter()


@router.get("/health")
async def health_check():
    """Basic health check endpoint"""
    return {
        "status": "healthy",
        "service": "infradyn-python-services"
    }


@router.get("/ready")
async def readiness_check():
    """Readiness check - can add dependency checks here"""
    return {
        "ready": True,
        "checks": {
            "api": True
        }
    }
