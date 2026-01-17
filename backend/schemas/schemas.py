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
    simple_explanation: str
    example_scenario: str
    action_tip: str
    tags: List[str]
    references_law: bool
    law_reference: Optional[str] = None


class ClauseFlag(BaseModel):
    clause: str
    category: str
    risk_level: Literal["HIGH", "MEDIUM", "LOW"]
    explanation: str
    user_impact: str
    simple_explanation: str
    example_scenario: str
    action_tip: str
    tags: List[str]


class AnalyzeResponse(BaseModel):
    overall_risk: Literal["HIGH", "MEDIUM", "LOW"]
    risk_score: int
    confidence_score: str
    what_you_give_up: List[str]
    risk_patterns: List[str]
    summary: List[str]
    flags: List[ClauseFlag]
