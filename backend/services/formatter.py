from typing import List
from schemas.schemas import AnalyzedClause, AnalyzeResponse
from services.scoring import calculate_overall_risk, select_flagged_clauses, generate_summary


def build_final_response(analyzed_clauses: List[AnalyzedClause]) -> AnalyzeResponse:
    """
    Converts analyzed clauses into final API response.
    """

    overall_risk = calculate_overall_risk(analyzed_clauses)
    flags = select_flagged_clauses(analyzed_clauses)
    summary = generate_summary(analyzed_clauses)

    return AnalyzeResponse(
        overall_risk=overall_risk,
        summary=summary,
        flags=flags
    )
