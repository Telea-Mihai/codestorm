"""
Shared Gemini client configuration.

All UC1 / UC2 / UC4 flows that call Google GenAI read the API key from the
environment (optionally via python-dotenv when app.py loads .env).
"""

from __future__ import annotations

import os

from google import genai


def get_gemini_client() -> genai.Client:
    """
    Build a google-genai client using GEMINI_API_KEY.

    Raises:
        ValueError: If the key is missing or blank.
    """
    api_key = (os.environ.get("GEMINI_API_KEY") or "").strip()
    if not api_key:
        raise ValueError(
            "GEMINI_API_KEY is not set. Add it to your environment or backend/.env "
            "to use UC1, UC2, and UC4 endpoints."
        )
    return genai.Client(api_key=api_key)
