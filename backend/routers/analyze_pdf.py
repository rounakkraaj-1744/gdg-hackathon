from fastapi import APIRouter, HTTPException, UploadFile, File
from schemas.schemas import AnalyzeResponse
from services.analyzer import analyze_text_pipeline
from services.formatter import build_final_response
import pdfplumber
import io
import traceback

router = APIRouter(prefix="/analyze-pdf", tags=["PDF Analysis"])


@router.post("/", response_model=AnalyzeResponse)
async def analyze_pdf(file: UploadFile = File(...)):
    """
    Analyze a PDF document for potential risks.
    Extracts text using pdfplumber and runs through existing analysis pipeline.
    """
    try:
        # Validate file type
        if not file.filename.lower().endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are accepted.")
        
        # Read file content
        content = await file.read()
        print(f"[PDF] Received file: {file.filename} ({len(content)} bytes)")
        
        # Extract text from PDF
        text = extract_text_from_pdf(content)
        
        # Validate extracted text
        if len(text) < 500:
            raise HTTPException(
                status_code=422, 
                detail="This PDF does not contain readable text. It may be scanned or protected."
            )
        
        print(f"[PDF] Extracted {len(text)} characters from PDF")
        
        # Run through existing analysis pipeline
        analyzed_clauses = await analyze_text_pipeline(text)
        print(f"[PDF] Found {len(analyzed_clauses)} clauses")
        
        # Build final response
        final_response = await build_final_response(analyzed_clauses)
        print(f"[PDF] Overall risk: {final_response.overall_risk}")
        
        return final_response
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"[ERROR] PDF analysis failed: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


def extract_text_from_pdf(content: bytes) -> str:
    """
    Extract text from PDF using pdfplumber.
    Returns concatenated text from all pages.
    """
    text_parts = []
    
    try:
        with pdfplumber.open(io.BytesIO(content)) as pdf:
            for page in pdf.pages:
                page_text = page.extract_text()
                if page_text:
                    text_parts.append(page_text)
    except Exception as e:
        print(f"[ERROR] PDF extraction failed: {str(e)}")
        raise Exception("Failed to read PDF file.")
    
    return "\n\n".join(text_parts)
