from fastapi import APIRouter, HTTPException
from schemas.schemas import AnalyzeRequest, AnalyzeResponse
from services.analyzer import analyze_text_pipeline
from services.formatter import build_final_response
import traceback

router = APIRouter(prefix="/analyze", tags=["Analysis"])


@router.post("/", response_model=AnalyzeResponse)
async def analyze_terms(request: AnalyzeRequest):
    try:
        # Log incoming request
        print(f"[ANALYZE] Received text with {len(request.text)} characters")
        
        # 1. Run full AI pipeline
        analyzed_clauses = await analyze_text_pipeline(request.text)
        print(f"[ANALYZE] Found {len(analyzed_clauses)} clauses")

        # 2. Build final structured response
        final_response = await build_final_response(analyzed_clauses)
        print(f"[ANALYZE] Overall risk: {final_response.overall_risk}")

        return final_response

    except Exception as e:
        print(f"[ERROR] Analysis failed: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

