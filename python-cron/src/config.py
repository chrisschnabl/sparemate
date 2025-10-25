"""Configuration management for SpareRoom Monitor"""

import os
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()


class Config:
    """Application configuration"""

    # Database
    # Note: On Vercel, you may need to use Vercel Postgres, Turso, or another
    # remote database since serverless functions are stateless
    DATABASE_PATH: str = os.getenv(
        "DATABASE_PATH",
        str(Path(__file__).parent.parent.parent / "spareroom.db")
    )

    # Email (Resend)
    RESEND_API_KEY: Optional[str] = os.getenv("RESEND_API_KEY")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "SpareRoom Monitor <noreply@example.com>")

    # Scraping
    USER_AGENT: str = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36"
    REQUEST_TIMEOUT: int = int(os.getenv("REQUEST_TIMEOUT", "30"))
    DELAY_BETWEEN_USERS: float = float(os.getenv("DELAY_BETWEEN_USERS", "1.0"))

    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "INFO")

    @classmethod
    def validate(cls) -> bool:
        """Validate that all required configuration is present"""
        if not cls.RESEND_API_KEY:
            raise ValueError("RESEND_API_KEY environment variable is required")
        return True


config = Config()
