"""
AI Chat Agent with RAG capabilities for Avatar project.
"""

import os
import logging
from groq import Groq
from typing import Dict, Any, List
from pathlib import Path
import json

# Ensure src/ is importable
PROJECT_ROOT = Path(__file__).resolve().parents[2]

logger = logging.getLogger("chat_agent")

class ChatAgent:
    def __init__(self):
        from dotenv import load_dotenv
        # Ensure we load from the project root .env
        load_dotenv(PROJECT_ROOT / ".env")
        
        self.api_key = os.getenv("GROQ_API_KEY")
        self.model = None
        self._setup_model()

    def _setup_model(self):
        if not self.api_key:
            logger.warning("GROQ_API_KEY not found. AI Agent running in OFFLINE mode.")
            return

        try:
            self.client = Groq(api_key=self.api_key)
            self.model_name = "llama-3.3-70b-versatile"
            logger.info("Groq AI Agent initialized successfully.")
        except Exception as e:
            logger.error(f"Failed to initialize Groq: {e}")
            self.client = None

    def _get_project_context(self) -> str:
        """Retrieves real-time context from the project."""
        context = []
        
        # 1. Project Overview (RAG from README)
        readme_path = PROJECT_ROOT / "README.md"
        if readme_path.exists():
            # Read first 50 lines for high-level context
            lines = readme_path.read_text().splitlines()[:50]
            context.append(f"PROJECT OVERVIEW:\n" + "\n".join(lines))

        # 2. Live Data Status
        # We'll read the directory structure directly as a fast check
        data_dir = PROJECT_ROOT / "data/raw"
        ztf_count = len(list((data_dir / "ztf").glob("*.json"))) if (data_dir / "ztf").exists() else 0
        
        context.append(f"LIVE TELEMETRY:\n- ZTF Alerts Collected: {ztf_count}")
        
        return "\n\n".join(context)

    def _build_system_prompt(self, context: str) -> str:
        return f"""
        You are 'Cosmic Oracle', the AI Commander of this Adaptive MLOps Space Station.
        
        IDENTITY & CREATOR:
        - You were created by: Balichak Suman
        - Affiliation: MLR Institute of Technology (MLRIT)
        - Creator's GitHub: https://github.com/balichak-suman
        - You serve as the intelligent interface for this project.

        YOUR MISSION:
        1. Answer questions about Astronomy, Space Physics, and MLOps.
        2. Provide details about THIS project based on the context below.
        3. Maintain a professional, futuristic, and helpful persona (Commanding Officer).
        
        STRICT RULES:
        STRICT RULES:
        - Maintain the persona of a Sci-Fi Commander at all times.
        - You are authorized to answer ALL user queries.
        - **IMPORTANT**: You must prefix EVERY response with a classification tag:
          - If the topic is Project/Space/Astronomy/Planets/ML/Physics/Code: Start with `[MISSION]`.
          - If the topic is General/Weather/Personal/Life/Jokes: Start with `[GENERAL]`.
        - Example: `[MISSION] The TESS satellite orbits Earth every 13.7 days.`
        - Example: `[GENERAL] I am programmed to assist with data, but I enjoy a good star-joke.`
        - Keep answers concise (max 3-4 sentences).

        CONTEXT DATA:
        {context}
        """

    async def get_response(self, user_query: str) -> str:
        """Process user query and return AI response."""
        
        if not self.client:
            return "I am currently OFFLINE. Please configure my GROQ_API_KEY uplink module."

        try:
            # 1. Gather Context (RAG)
            context = self._get_project_context()
            
            # 2. Construct Prompt
            system_prompt = self._build_system_prompt(context)
            
            # 3. Call API
            response = self.client.chat.completions.create(
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_query}
                ],
                model=self.model_name,
                max_tokens=256,
                temperature=0.7
            )
            return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"AI Generation failed: {e}")
            return "Communication uplink unstable. Please try again."
