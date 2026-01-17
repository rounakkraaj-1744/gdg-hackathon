from typing import List
from schemas.schemas import AnalyzedClause, ClauseFlag


def calculate_overall_risk(analyzed_clauses: List[AnalyzedClause]) -> str:
    """
    Converts clause-level risk into document-level risk.
    """

    score = 0

    for clause in analyzed_clauses:
        if clause.risk_level == "HIGH":
            score += 3
        elif clause.risk_level == "MEDIUM":
            score += 2
        elif clause.risk_level == "LOW":
            score += 1

    # Simple thresholds (tweakable)
    if score >= 8:
        return "HIGH"
    elif score >= 4:
        return "MEDIUM"
    else:
        return "LOW"


def select_flagged_clauses(analyzed_clauses: List[AnalyzedClause]) -> List[ClauseFlag]:
    """
    Choose which clauses to show to the user.
    We prioritize HIGH risk, then MEDIUM.
    """

    flagged = []

    for clause in analyzed_clauses:
        if clause.risk_level == "HIGH":
            flagged.append(
                ClauseFlag(
                    clause=clause.clause,
                    category=clause.category,
                    risk_level=clause.risk_level,
                    explanation=clause.explanation,
                    user_impact=clause.user_impact
                )
            )

    # If no HIGH, include MEDIUM
    if not flagged:
        for clause in analyzed_clauses:
            if clause.risk_level == "MEDIUM":
                flagged.append(
                    ClauseFlag(
                        clause=clause.clause,
                        category=clause.category,
                        risk_level=clause.risk_level,
                        explanation=clause.explanation,
                        user_impact=clause.user_impact
                    )
                )

    return flagged


def generate_summary(analyzed_clauses: List[AnalyzedClause]) -> List[str]:
    """
    Generates a short list of key risks for the user.
    """

    summary_points = []

    for clause in analyzed_clauses:
        if clause.risk_level == "HIGH":
            summary_points.append(clause.user_impact)

    # Deduplicate
    summary_points = list(dict.fromkeys(summary_points))

    # Limit to 3 points
    return summary_points[:3]
