import asyncio
import json
import os
import sys

# Ensure backend directory is in python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.analyzer import analyze_text_pipeline
from services.formatter import build_final_response

# Load sample text
with open("test_payload.json", "r") as f:
    payload = json.load(f)
    text = payload["text"]

async def run_test():
    print("🚀 Starting Live Backend Test...")
    print(f"📥 Input Text Length: {len(text)} chars")

    try:
        # Step 1: Analyze Clauses
        print("\n🔍 Step 1: Running Analysis Pipeline (Extracting & Analyzing Clauses)...")
        analyzed_clauses = await analyze_text_pipeline(text)
        print(f"✅ Analysis Complete. Analyzed {len(analyzed_clauses)} clauses.")

        # Step 2: Build Final Response (Synthesis)
        print("\n🧠 Step 2: Synthesizing Final Report (Logic + LLM)...")
        final_response = await build_final_response(analyzed_clauses)

        # Step 3: Output Result
        print("\n🎉 Test Complete! Generating Output...")
        
        # Convert Pydantic model to dict
        result = final_response.dict()
        print(json.dumps(result, indent=2))

        # Verification Checks
        print("\n-------- VERIFICATION CHECKS --------")
        
        # Check Rich Fields
        first_flag = result["flags"][0] if result["flags"] else None
        if first_flag:
            has_simple = "simple_explanation" in first_flag and first_flag["simple_explanation"]
            has_example = "example_scenario" in first_flag and first_flag["example_scenario"]
            has_tags = "tags" in first_flag and len(first_flag["tags"]) > 0
            
            print(f"[{'PASSED' if has_simple else 'FAILED'}] Simple Explanation Present")
            print(f"[{'PASSED' if has_example else 'FAILED'}] Example Scenario Present")
            print(f"[{'PASSED' if has_tags else 'FAILED'}] Tags Present")
        else:
             print("[WARNING] No flags found to verify rich fields!")

        # Check Synthesis Fields
        has_give_up = "what_you_give_up" in result and len(result["what_you_give_up"]) > 0
        has_patterns = "risk_patterns" in result and len(result["risk_patterns"]) > 0
        has_score = "risk_score" in result
        
        print(f"[{'PASSED' if has_give_up else 'FAILED'}] 'What You Give Up' Section Present")
        print(f"[{'PASSED' if has_patterns else 'FAILED'}] 'Risk Patterns' Section Present")
        print(f"[{'PASSED' if has_score else 'FAILED'}] Risk Score Present ({result.get('risk_score', 'N/A')})")

    except Exception as e:
        print(f"\n❌ Test Failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(run_test())
