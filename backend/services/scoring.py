from typing import List
from schemas.schemas import AnalyzedClause, ClauseFlag


def calculate_risk_score(analyzed_clauses: List[AnalyzedClause]) -> int:
    """
    Calculates a numerical risk score (0-100).
    """
    total_score = 0
    max_score = len(analyzed_clauses) * 3 if analyzed_clauses else 1

    # NEW: Check strictly for any flags (HIGH/MEDIUM). If none, risk score is 0.
    # The user requested: "if nothing detected ... risk score to 0"
    has_flagged_risks = any(c.risk_level in ["HIGH", "MEDIUM"] for c in analyzed_clauses)
    if not has_flagged_risks:
        return 0

    for clause in analyzed_clauses:
        if clause.risk_level == "HIGH":
            total_score += 3
        elif clause.risk_level == "MEDIUM":
            total_score += 2
        elif clause.risk_level == "LOW":
            total_score += 1
    
    if not analyzed_clauses:
        return 0

    # Normalize to 0-100 scale
    normalized_score = int((total_score / max_score) * 100)
    return min(100, normalized_score)

def calculate_overall_risk(analyzed_clauses: List[AnalyzedClause]) -> str:
    """
    Converts clause-level risk into document-level risk.
    """
    score = 0
    high_count = 0

    for clause in analyzed_clauses:
        if clause.risk_level == "HIGH":
            score += 3
            high_count += 1
        elif clause.risk_level == "MEDIUM":
            score += 2
        elif clause.risk_level == "LOW":
            score += 1

    # Logic: If >2 HIGH risks or high total score, it's HIGH risk
    if high_count >= 2 or score >= 15:
        return "HIGH"
    elif score >= 8:
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
        # Show all HIGH and MEDIUM risks
        if clause.risk_level in ["HIGH", "MEDIUM"]:
            flagged.append(
                ClauseFlag(
                    clause=clause.clause,
                    category=clause.category,
                    risk_level=clause.risk_level,
                    explanation=clause.explanation,
                    user_impact=clause.user_impact,
                    simple_explanation=clause.simple_explanation,
                    example_scenario=clause.example_scenario,
                    action_tip=clause.action_tip,
                    tags=clause.tags
                )
            )

    # Sort: HIGH first, then MEDIUM
    flagged.sort(key=lambda x: 0 if x.risk_level == "HIGH" else 1)

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
