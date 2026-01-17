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
            You are a legal document structure extraction engine.

            Your task is to analyze raw Terms & Conditions or policy text and extract individual legal clauses.

            Rules:
            1. You are NOT a chatbot.
            2. You do NOT explain anything.
            3. You do NOT summarize.
            4. You do NOT give legal advice.
            5. You ONLY extract clauses and categorize them.
            6. You MUST output valid JSON only.
            7. You MUST NOT include markdown, comments, or extra text.
            8. You MUST NOT hallucinate clauses that do not exist.
            9. You MUST preserve the original wording of the clause.
            10. Extract at most 10 most important/risky clauses.

            Allowed categories:
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

            Output format:

            [
            {
                "clause_id": "C1",
                "category": "Data Privacy",
                "text": "Exact clause text"
            }
            ]

            If no meaningful legal clause is found, return [].

            Return JSON ONLY.
"""


RISK_ANALYSIS_SYSTEM_PROMPT = """
You are a legal risk interpretation engine designed for non-lawyers.

                    Your task is to analyze a legal clause and determine:
                    1. Whether it is risky for the user
                    2. Why it is risky
                    3. What it practically means for the user

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
                    "explanation": "Plain English explanation",
                    "user_impact": "What this means for the user",
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
        law_reference=parsed.get("law_reference")
    )