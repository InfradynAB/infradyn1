"""
KPI Router
API endpoints for KPI calculations
"""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional
from datetime import date

from app.services.kpi_service import KPIService


router = APIRouter(tags=["kpi"])


# Request models
class KPIRequest(BaseModel):
    organization_id: str
    project_id: Optional[str] = None
    date_from: Optional[date] = None
    date_to: Optional[date] = None


# Initialize KPI service
kpi_service = KPIService()


@router.post("/dashboard")
async def get_dashboard_kpis(request: KPIRequest):
    """
    Get all dashboard KPIs in one optimized call
    """
    try:
        print(f"[KPI] Dashboard request: org={request.organization_id}, proj={request.project_id}")
        kpis = await kpi_service.get_dashboard_kpis(
            organization_id=request.organization_id,
            project_id=request.project_id,
            date_from=request.date_from,
            date_to=request.date_to
        )
        print(f"[KPI] Dashboard success")
        return {"success": True, "data": kpis}
    except Exception as e:
        import traceback
        print(f"[KPI] Dashboard error: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/financial")
async def get_financial_kpis(request: KPIRequest):
    """Get Financial KPIs"""
    try:
        kpis = await kpi_service.get_financial_kpis(
            organization_id=request.organization_id,
            project_id=request.project_id,
            date_from=request.date_from,
            date_to=request.date_to
        )
        return {"success": True, "data": kpis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/progress")
async def get_progress_kpis(request: KPIRequest):
    """Get Progress KPIs"""
    try:
        kpis = await kpi_service.get_progress_kpis(
            organization_id=request.organization_id,
            project_id=request.project_id,
            date_from=request.date_from,
            date_to=request.date_to
        )
        return {"success": True, "data": kpis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/quality")
async def get_quality_kpis(request: KPIRequest):
    """Get Quality KPIs"""
    try:
        kpis = await kpi_service.get_quality_kpis(
            organization_id=request.organization_id,
            project_id=request.project_id,
            date_from=request.date_from,
            date_to=request.date_to
        )
        return {"success": True, "data": kpis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/suppliers")
async def get_supplier_kpis(request: KPIRequest):
    """Get Supplier KPIs"""
    try:
        kpis = await kpi_service.get_supplier_kpis(
            organization_id=request.organization_id,
            project_id=request.project_id,
            date_from=request.date_from,
            date_to=request.date_to
        )
        return {"success": True, "data": kpis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/payments")
async def get_payment_kpis(request: KPIRequest):
    """Get Payment KPIs"""
    try:
        kpis = await kpi_service.get_payment_kpis(
            organization_id=request.organization_id,
            project_id=request.project_id,
            date_from=request.date_from,
            date_to=request.date_to
        )
        return {"success": True, "data": kpis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/logistics")
async def get_logistics_kpis(request: KPIRequest):
    """Get Logistics KPIs"""
    try:
        kpis = await kpi_service.get_logistics_kpis(
            organization_id=request.organization_id,
            project_id=request.project_id,
            date_from=request.date_from,
            date_to=request.date_to
        )
        return {"success": True, "data": kpis}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/scurve")
async def get_scurve_data(request: KPIRequest):
    """Get S-Curve data for charts"""
    try:
        data = await kpi_service.get_scurve_data(
            organization_id=request.organization_id,
            project_id=request.project_id,
            date_from=request.date_from,
            date_to=request.date_to
        )
        return {"success": True, "data": data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
