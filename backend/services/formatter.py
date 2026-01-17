from typing import List
from schemas.schemas import AnalyzedClause, AnalyzeResponse
from services.scoring import calculate_overall_risk, calculate_risk_score, select_flagged_clauses, generate_summary
from services.llm_services import synthesize_risk_report


async def build_final_response(analyzed_clauses: List[AnalyzedClause]) -> AnalyzeResponse:
    """
    Converts analyzed clauses into final API response.
    """

    overall_risk = calculate_overall_risk(analyzed_clauses)
    risk_score = calculate_risk_score(analyzed_clauses)
    flags = select_flagged_clauses(analyzed_clauses)
    summary = generate_summary(analyzed_clauses)
    
    # AI Synthesis
    synthesis = await synthesize_risk_report(analyzed_clauses)

    return AnalyzeResponse(
        overall_risk=overall_risk,
        risk_score=risk_score,
        confidence_score="85%",  # Placeholder until calibration logic is added
        what_you_give_up=synthesis.get("what_you_give_up", []),
        risk_patterns=synthesis.get("risk_patterns", []),
        summary=summary,
        flags=flags
    )
