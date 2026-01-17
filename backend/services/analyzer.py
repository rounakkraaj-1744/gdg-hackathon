from typing import List
from services.llm_services import extract_clauses_from_chunk, analyze_clause_risk
from schemas.schemas import AnalyzedClause


async def analyze_text_pipeline(text: str) -> List[AnalyzedClause]:
    """
    Full analysis pipeline:
    1. Extract clauses from text
    2. Analyze risk for each clause
    3. Return analyzed clauses
    """
    # Step 1: Extract clauses
    clauses = await extract_clauses_from_chunk(text)
    
    # Step 2: Analyze each clause
    analyzed_clauses = []
    for clause in clauses:
        analyzed = await analyze_clause_risk(clause)
        analyzed_clauses.append(analyzed)
    
    return analyzed_clauses
