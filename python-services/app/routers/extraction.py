"""
AI Extraction Router
Endpoints for document extraction (PO, Invoices, etc.)
"""
from fastapi import APIRouter, HTTPException, UploadFile, File
from pydantic import BaseModel
from typing import Optional, List
from enum import Enum

from app.services.ai_extraction import AIExtractionService

router = APIRouter()

# Initialize service
extraction_service = AIExtractionService()


# ============================================================================
# SCHEMAS
# ============================================================================

class DocumentType(str, Enum):
    PURCHASE_ORDER = "purchase_order"
    INVOICE = "invoice"
    MILESTONE = "milestone"


class ExtractedMilestone(BaseModel):
    title: str
    description: Optional[str] = None
    expected_date: Optional[str] = None
    payment_percentage: float


class ExtractedBOQItem(BaseModel):
    item_number: str
    description: str
    unit: str
    quantity: float
    unit_price: float
    total_price: float


class ExtractedPOData(BaseModel):
    po_number: Optional[str] = None
    vendor_name: Optional[str] = None
    date: Optional[str] = None
    total_value: Optional[float] = None
    currency: Optional[str] = None
    scope: Optional[str] = None
    payment_terms: Optional[str] = None
    incoterms: Optional[str] = None
    retention_percentage: Optional[float] = None
    milestones: List[ExtractedMilestone] = []
    boq_items: List[ExtractedBOQItem] = []
    confidence: float = 0.0
    raw_text: Optional[str] = None


class ExtractedInvoiceData(BaseModel):
    invoice_number: Optional[str] = None
    vendor_name: Optional[str] = None
    date: Optional[str] = None
    due_date: Optional[str] = None
    total_amount: Optional[float] = None
    currency: Optional[str] = None
    line_items: List[dict] = []
    tax_amount: Optional[float] = None
    subtotal: Optional[float] = None
    confidence: float = 0.0


class ExtractionRequest(BaseModel):
    file_url: str
    document_type: DocumentType = DocumentType.PURCHASE_ORDER


class ExtractionResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/document", response_model=ExtractionResponse)
async def extract_document(request: ExtractionRequest):
    """
    Extract structured data from a document URL (S3)
    
    Supports:
    - Purchase Orders (PDF, Word, Excel)
    - Invoices (PDF, Word)
    - Milestone Schedules (Excel, PDF)
    """
    try:
        if request.document_type == DocumentType.PURCHASE_ORDER:
            result = await extraction_service.extract_purchase_order(request.file_url)
        elif request.document_type == DocumentType.INVOICE:
            result = await extraction_service.extract_invoice(request.file_url)
        elif request.document_type == DocumentType.MILESTONE:
            result = await extraction_service.extract_milestones(request.file_url)
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported document type: {request.document_type}")
        
        return result
        
    except Exception as e:
        return ExtractionResponse(
            success=False,
            error=str(e)
        )


@router.post("/upload", response_model=ExtractionResponse)
async def extract_uploaded_file(
    file: UploadFile = File(...),
    document_type: DocumentType = DocumentType.PURCHASE_ORDER
):
    """
    Extract structured data from an uploaded file
    
    Accepts: PDF, DOCX, XLSX, PNG, JPG
    """
    try:
        # Read file content
        content = await file.read()
        filename = file.filename or "document"
        
        result = await extraction_service.extract_from_bytes(
            content,
            filename,
            document_type.value
        )
        
        return result
        
    except Exception as e:
        return ExtractionResponse(
            success=False,
            error=str(e)
        )


@router.post("/milestones", response_model=ExtractionResponse)
async def extract_milestones_only(request: ExtractionRequest):
    """
    Extract only milestones from a document
    Optimized for Excel milestone schedules
    """
    try:
        result = await extraction_service.extract_milestones(request.file_url)
        return result
    except Exception as e:
        return ExtractionResponse(
            success=False,
            error=str(e)
        )
