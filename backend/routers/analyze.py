from fastapi import APIRouter, HTTPException
from schemas.schemas import AnalyzeRequest, AnalyzeResponse
from services.analyzer import analyze_text_pipeline
from services.formatter import build_final_response

router = APIRouter(prefix="/analyze", tags=["Analysis"])


@router.post("/", response_model=AnalyzeResponse)
async def analyze_terms(request: AnalyzeRequest):
    try:
        # 1. Run full AI pipeline
        analyzed_clauses = await analyze_text_pipeline(request.text)

        # 2. Build final structured response
        final_response = build_final_response(analyzed_clauses)

        return final_response

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
