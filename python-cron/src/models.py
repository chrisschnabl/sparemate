"""Data models for SpareRoom Monitor"""

from dataclasses import dataclass
from typing import Optional


@dataclass
class User:
    """Represents a user subscription"""
    id: int
    email: str
    spareroom_url: Optional[str]
    last_checked_ad_id: Optional[str]
    active: bool


@dataclass
class SpareRoomAd:
    """Represents a SpareRoom listing"""
    id: str
    url: str
    title: str
    price: Optional[str] = None
    location: Optional[str] = None
    property_type: Optional[str] = None
    availability: Optional[str] = None
    bills_included: bool = False
    min_term: Optional[str] = None
    max_term: Optional[str] = None
    raw_text: str = ""

    def format_for_email(self) -> str:
        """Format the ad details for email display"""
        lines = [
            f"**{self.title}**",
            f"ID: {self.id}",
            f"URL: {self.url}",
        ]

        if self.price:
            price_str = f"{self.price} (bills included)" if self.bills_included else self.price
            lines.append(f"Price: {price_str}")

        if self.location:
            lines.append(f"Location: {self.location}")

        if self.property_type:
            lines.append(f"Type: {self.property_type}")

        if self.availability:
            lines.append(f"Availability: {self.availability}")

        if self.min_term or self.max_term:
            term_parts = []
            if self.min_term:
                term_parts.append(f"min {self.min_term}")
            if self.max_term:
                term_parts.append(f"max {self.max_term}")
            lines.append(f"Term: {', '.join(term_parts)}")

        return "\n".join(lines)


@dataclass
class CronResult:
    """Represents the result of a cron job run"""
    processed: int = 0
    successful: int = 0
    failed: int = 0
    notifications: int = 0
    errors: list[str] = None

    def __post_init__(self):
        if self.errors is None:
            self.errors = []

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization"""
        return {
            "processed": self.processed,
            "successful": self.successful,
            "failed": self.failed,
            "notifications": self.notifications,
            "errors": self.errors,
        }
