import asyncio
from typing import List
from services.llm_services import extract_clauses_from_chunk, analyze_clause_risk, MAX_TEXT_LENGTH
from schemas.schemas import AnalyzedClause

# Limit clause analysis to avoid rate limits
MAX_CLAUSES_TO_ANALYZE = 3

async def analyze_text_pipeline(text: str) -> List[AnalyzedClause]:
    """
    Full analysis pipeline:
    1. Truncate text if too long
    2. Extract clauses from text
    3. Analyze risk for each clause (limited to avoid rate limits)
    4. Return analyzed clauses
    """
    # Truncate text to avoid rate limits
    if len(text) > MAX_TEXT_LENGTH:
        print(f"[ANALYZE] Truncating text from {len(text)} to {MAX_TEXT_LENGTH} chars")
        text = text[:MAX_TEXT_LENGTH]
    
    # Step 1: Extract clauses
    clauses = await extract_clauses_from_chunk(text)
    print(f"[ANALYZE] Extracted {len(clauses)} clauses")
    
    # Limit number of clauses to analyze (rate limit protection)
    if len(clauses) > MAX_CLAUSES_TO_ANALYZE:
        print(f"[ANALYZE] Limiting to {MAX_CLAUSES_TO_ANALYZE} clauses")
        clauses = clauses[:MAX_CLAUSES_TO_ANALYZE]
    
    # Step 2: Analyze each clause (with delay to avoid rate limits)
    analyzed_clauses = []
    for i, clause in enumerate(clauses):
        if i > 0:
            # Longer delay between API calls to avoid rate limiting
            await asyncio.sleep(5)
        analyzed = await analyze_clause_risk(clause)
        analyzed_clauses.append(analyzed)
    
    return analyzed_clauses
