import asyncio
from typing import List
from services.llm_services import extract_clauses_from_chunk, analyze_clause_risk, MAX_TEXT_LENGTH
from schemas.schemas import AnalyzedClause


async def analyze_text_pipeline(text: str) -> List[AnalyzedClause]:
    # Truncate text to avoid rate limits
    if len(text) > MAX_TEXT_LENGTH:
        print(f"[ANALYZE] Truncating text from {len(text)} to {MAX_TEXT_LENGTH} chars")
        text = text[:MAX_TEXT_LENGTH]
    
    # Step 1: Extract clauses (already capped deterministically in prompt)
    clauses = await extract_clauses_from_chunk(text)
    print(f"[ANALYZE] Extracted {len(clauses)} clauses")

    # Safety: ensure deterministic order
    clauses.sort(key=lambda c: c.clause_id)

    # Step 2: Analyze each clause (rate-limit safe)
    analyzed_clauses = []
    for i, clause in enumerate(clauses):
        if i > 0:
            await asyncio.sleep(5)  # avoid Groq rate limits
        analyzed = await analyze_clause_risk(clause)
        analyzed_clauses.append(analyzed)
    
    return analyzed_clauses