
import sys
import os

# Add the current directory to sys.path so we can import services and schemas
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.scoring import calculate_risk_score
from schemas.schemas import AnalyzedClause

def test_risk_score_low_only():
    clauses = [
        AnalyzedClause(
            clause_id="1",
            clause="test clause",
            category="General",
            risk_level="LOW", # Only LOW risk
            explanation="Low risk",
            user_impact="None",
            simple_explanation="basic",
            example_scenario="scenario",
            action_tip="tip",
            tags=[],
            references_law=False
        )
    ]
    score = calculate_risk_score(clauses)
    print(f"Risk Score for LOW only: {score}")

    if score > 0:
        print("Issue Reproduced: Score is > 0 even with only LOW risk clauses.")
    else:
        print("Score is 0 as expected.")

if __name__ == "__main__":
    test_risk_score_low_only()
