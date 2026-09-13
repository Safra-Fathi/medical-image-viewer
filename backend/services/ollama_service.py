import json
import os
from typing import Any

import httpx
from dotenv import load_dotenv

from models import AI_DISCLAIMER
from services.anonymization import build_llm_payload
from services.groq_service import SYSTEM_PROMPT, STYLE_INSTRUCTIONS


load_dotenv()

OLLAMA_BASE_URL = os.getenv(
    "OLLAMA_BASE_URL",
    "http://127.0.0.1:11434",
).rstrip("/")

OLLAMA_MODEL = os.getenv(
    "OLLAMA_MODEL",
    "llama3.2",
)


def generate_ollama_explanation(
    analysis: dict[str, Any],
    metadata: dict[str, Any] | None = None,
    style: str = "technical",
) -> dict[str, Any]:

    if style not in STYLE_INSTRUCTIONS:
        raise ValueError(
            f"Unsupported explanation style: {style}"
        )

    payload = build_llm_payload(
        analysis=analysis,
        metadata=metadata,
    )

    if not payload:
        raise ValueError(
            "No approved analysis data was provided."
        )

    user_prompt = (
        STYLE_INSTRUCTIONS[style]
        + "\n\n"
        + "Structured segmentation results:\n"
        + json.dumps(
            payload,
            indent=2,
        )
    )

    response = httpx.post(
        f"{OLLAMA_BASE_URL}/api/chat",
        json={
            "model": OLLAMA_MODEL,
            "stream": False,
            "messages": [
                {
                    "role": "system",
                    "content": SYSTEM_PROMPT,
                },
                {
                    "role": "user",
                    "content": user_prompt,
                },
            ],
            "options": {
                "temperature": 0.2,
            },
        },
        timeout=120.0,
    )

    response.raise_for_status()

    data = response.json()

    explanation = (
        data.get("message", {})
        .get("content", "")
        .strip()
    )

    if not explanation:
        raise RuntimeError(
            "Ollama returned an empty response."
        )

    return {
        "success": True,
        "provider": "ollama",
        "model": OLLAMA_MODEL,
        "explanation": explanation,
        "disclaimer": AI_DISCLAIMER,
    }