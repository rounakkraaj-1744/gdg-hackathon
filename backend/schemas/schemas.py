from pydantic import BaseModel, Field
from typing import List, Optional, Literal


class AnalyzeRequest(BaseModel):
    text: str = Field(..., description="Raw Terms & Conditions or policy text")


class ExtractedClause(BaseModel):
    clause_id: str
    category: str
    text: str


class AnalyzedClause(BaseModel):
    clause_id: str
    clause: str
    category: str
    risk_level: Literal["HIGH", "MEDIUM", "LOW"]
    explanation: str
    user_impact: str
    references_law: bool
    law_reference: Optional[str] = None


class ClauseFlag(BaseModel):
    clause: str
    category: str
    risk_level: Literal["HIGH", "MEDIUM", "LOW"]
    explanation: str
    user_impact: str


class AnalyzeResponse(BaseModel):
    overall_risk: Literal["HIGH", "MEDIUM", "LOW"]
    summary: List[str]
    flags: List[ClauseFlag]
