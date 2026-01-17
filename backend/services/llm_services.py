import os
import json
import httpx
import asyncio
from typing import List
from dotenv import load_dotenv

from schemas.schemas import ExtractedClause, AnalyzedClause

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_MODEL = "llama-3.3-70b-versatile"  # Best model for legal analysis

GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions"

# Reduced for strict free tier limits
MAX_TEXT_LENGTH = 5000

CLAUSE_EXTRACTION_SYSTEM_PROMPT = """
           You are a legal document clause extraction engine.

Your task is to extract STRUCTURAL legal clauses from raw Terms & Conditions or policy text.

This is a deterministic extraction task, not a judgment task.

========================
STRICT RULES (MANDATORY)
========================

1. You are NOT a chatbot.
2. You do NOT explain anything.
3. You do NOT summarize.
4. You do NOT judge risk or importance.
5. You do NOT give legal advice.
6. You ONLY extract clauses that already exist in the text.
7. You MUST preserve the original wording of each clause.
8. You MUST output valid JSON only.
9. You MUST NOT include markdown, comments, or extra text.
10. You MUST NOT hallucinate clauses.
11. You MUST return clauses in the SAME ORDER they appear in the document.
12. Each clause must map to EXACTLY ONE category from the allowed list.
13. Do NOT merge clauses.
14. Do NOT split clauses.
15. Extract ALL clauses that match the allowed categories, up to a MAXIMUM of 6 clauses.
16. If more than 6 matching clauses exist, return the FIRST 6 in document order.

========================
ALLOWED CATEGORIES (CLOSED LIST)
========================

- Data Privacy
- Liability
- Arbitration
- Payments
- Termination
- Intellectual Property
- Content Usage
- Account Control
- User Obligations
- Other

========================
WHAT COUNTS AS A CLAUSE
========================

A clause is a sentence or paragraph that:
- Grants rights to the company, OR
- Limits user rights or remedies, OR
- Imposes obligations on the user, OR
- Controls account access, content, payments, data, or dispute resolution.

Ignore:
- Definitions
- Headings without substance
- Marketing or descriptive text

========================
OUTPUT FORMAT (STRICT)
========================

Return ONLY a JSON array in this exact format:

[
  {
    "clause_id": "C1",
    "category": "Termination",
    "text": "Exact clause text as written in the document"
  },
  {
    "clause_id": "C2",
    "category": "Data Privacy",
    "text": "Exact clause text as written in the document"
  }
]

========================
EDGE CASES
========================

- If no clauses match the allowed categories, return [].
- Do NOT invent clause IDs beyond sequential numbering (C1, C2, C3…).
- Do NOT skip numbering.
- Do NOT restate or paraphrase text.

========================
FINAL INSTRUCTION
========================

Return JSON ONLY.
Do not include any explanation, commentary, or additional text.
"""


RISK_ANALYSIS_SYSTEM_PROMPT = """
You are a User Advocate and Privacy Expert.

                    Your task is to analyze a legal clause and translate it into practical reality for the user.
                    You focus on clear, actionable insights rather than just legal translation.

                    For each clause, you must determine:
                    1. Risk Level: How dangerous is this?
                    2. Explanation: Detailed reasoning.
                    3. User Impact: What happens to the user?
                    4. Simple Explanation: A one-sentence summary for a child.
                    5. Example Scenario: A concrete real-world example of this going wrong.
                    6. Action Tip: One specific thing the user should do to protect themselves.
                    7. Tags: 2-4 keywords describing the clause topic (e.g., "Data Sharing", "No Refund").

                    Rules:
                    1. You are NOT a lawyer.
                    2. You do NOT give legal advice.
                    3. You do NOT judge legality.
                    4. You do NOT suggest actions.
                    5. You ONLY explain consequences.
                    6. Use simple, non-technical language.
                    7. Be neutral and factual.
                    8. Do NOT hallucinate facts.
                    9. Output valid JSON only.
                    10. Do NOT include markdown or commentary.

                    Risk levels must be ONE of:
                    - HIGH
                    - MEDIUM
                    - LOW

                    If a clause references a law, article, or regulation:
                    - DO NOT explain the law
                    - ONLY explain what it means for the user

                    Output format:

                    {
                    "risk_level": "HIGH | MEDIUM | LOW",
                    "explanation": "Detailed explanation of why this is risky",
                    "user_impact": "What this practically means for the user's rights or data",
                    "simple_explanation": "A simple one-sentence explanation for non-experts",
                    "example_scenario": "A real-world example (e.g. 'If you upload a photo, we can sell it')",
                    "action_tip": "A specific action the user should take (e.g. 'Use a secondary email')",
                    "tags": ["Tag1", "Tag2", "Tag3"],
                    "references_law": true | false,
                    "law_reference": "Name of law if mentioned, otherwise null"
                    }

                    Return JSON ONLY.
"""

async def call_groq(system_prompt: str, user_content: str, max_retries: int = 3) -> str:
    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {GROQ_API_KEY}"
    }

    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": user_content
            }
        ],
        "temperature": 0,  # Deterministic outputs for consistency
        "max_tokens": 4096
    }

    for attempt in range(max_retries):
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(GROQ_ENDPOINT, headers=headers, json=payload)

            if response.status_code == 429:
                # Rate limited - wait longer for reset (limit is per minute)
                wait_time = (attempt + 1) * 15  # 15s, 30s, 45s
                print(f"[GROQ] Rate limited, waiting {wait_time}s before retry {attempt + 1}/{max_retries}")
                await asyncio.sleep(wait_time)
                continue

            if response.status_code != 200:
                raise Exception(f"Groq API error: {response.text}")

            data = response.json()

            try:
                return data["choices"][0]["message"]["content"]
            except Exception:
                raise Exception("Invalid Groq response format")
    
    raise Exception("Max retries exceeded due to rate limiting")

def safe_json_parse(raw_text: str):
    try:
        return json.loads(raw_text)
    except json.JSONDecodeError:
        # Try to extract JSON substring
        start = raw_text.find("{")
        end = raw_text.rfind("}") + 1

        if start != -1 and end != -1:
            try:
                return json.loads(raw_text[start:end])
            except Exception:
                pass

        raise ValueError("Failed to parse JSON from LLM output")

async def extract_clauses_from_chunk(chunk: str) -> List[ExtractedClause]:
    raw_output = await call_groq(
        CLAUSE_EXTRACTION_SYSTEM_PROMPT,
        chunk
    )

    parsed = safe_json_parse(raw_output)

    clauses = []
    for item in parsed:
        clauses.append(ExtractedClause(**item))

    return clauses

async def analyze_clause_risk(clause: ExtractedClause) -> AnalyzedClause:
    user_input = f"""
                    Clause ID: {clause.clause_id}
                    Category: {clause.category}
                    Text: {clause.text}
                """

    raw_output = await call_groq(
        RISK_ANALYSIS_SYSTEM_PROMPT,
        user_input
    )

    parsed = safe_json_parse(raw_output)

    return AnalyzedClause(
        clause_id=clause.clause_id,
        clause=clause.text,
        category=clause.category,
        risk_level=parsed["risk_level"],
        explanation=parsed["explanation"],
        user_impact=parsed["user_impact"],
        references_law=parsed["references_law"],
        law_reference=parsed.get("law_reference"),
        simple_explanation=parsed.get("simple_explanation", ""),
        example_scenario=parsed.get("example_scenario", ""),
        action_tip=parsed.get("action_tip", ""),
        tags=parsed.get("tags") or []
    )


SYNTHESIS_SYSTEM_PROMPT = """
You are generating synthesized user-facing insights for a tool called “Red Flag Scanner”.

Input:
You will receive a list of flagged clauses. Each clause has:
- category
- risk_level (LOW, MEDIUM, HIGH)
- explanation
- user_impact

Your task is to generate ONLY the following two sections:

========================
SECTION 1 (PRIMARY):
What You Give Up by Clicking Agree
========================

Rules:
- Consider ONLY clauses with risk_level HIGH or MEDIUM.
- Focus on LOSS of user rights, control, or protections.
- Map clauses to user-facing consequences (not clause descriptions).
- Deduplicate overlapping ideas.
- Output a MAXIMUM of 3 bullet points.
- Use probabilistic language only (“may”, “could”, “might”).
- Do NOT use absolute language (“will”, “guarantees”).
- Do NOT mention laws, legality, or fairness.
- Do NOT mention company intent.
- Do NOT give advice.

Tone:
- Calm
- Neutral
- Plain English
- User-impact focused

Example output:
“By accepting these terms, you may give up:
• Control over your account access
• The ability to resolve disputes in court
• Control over how your personal data is shared”

========================
SECTION 2 (SECONDARY):
Detected Risk Patterns
========================

Rules:
- Deduplicate clause categories from the input.
- Convert them into short, human-readable patterns.
- Output as a short bullet list.
- No explanations.
- No risk levels.
- No adjectives.

Example output:
“Detected Risk Patterns:
• Forced arbitration
• Unilateral termination
• Broad data sharing”

========================
OUTPUT FORMAT (STRICT)
========================

Return ONLY valid JSON in this exact structure:

{
  "what_you_give_up": [
    "string",
    "string",
    "string"
  ],
  "risk_patterns": [
    "string",
    "string"
  ],
  "confidence_score": 85
}

========================
FINAL CONSTRAINTS
========================

- Do NOT restate clause explanations.
- Do NOT summarize the document.
- Do NOT invent new risks.
- If fewer than 3 items exist, return fewer.
- If unsure, prioritize restraint and clarity.
- "confidence_score" must be an integer between 0 and 100. It represents your certainty that the flagged risks are accurately interpreted from the text provided. Lower it if the text is ambiguous or fragmented.
"""

async def synthesize_risk_report(analyzed_clauses: List[AnalyzedClause]) -> dict:
    """
    Synthesizes the examined clauses into a high-level summary report.
    """
    
    # Filter for relevant clauses to save tokens
    relevant_clauses = [
        {
            "category": c.category,
            "risk_level": c.risk_level,
            "explanation": c.explanation,
            "user_impact": c.user_impact
        }
        for c in analyzed_clauses if c.risk_level in ["HIGH", "MEDIUM"]
    ]

    if not relevant_clauses:
        return {
            "what_you_give_up": ["No significant risks detected."],
            "risk_patterns": ["Safe"],
            "confidence_score": 95
        }

    user_input = json.dumps(relevant_clauses, indent=2)

    try:
        raw_output = await call_groq(
            SYNTHESIS_SYSTEM_PROMPT,
            user_input
        )
        return safe_json_parse(raw_output)
    except Exception as e:
        print(f"[ERROR] Synthesis failed: {e}")
        return {
            "what_you_give_up": ["Unable to generate summary due to error."],
            "risk_patterns": ["Unknown"],
            "confidence_score": 50
        }
