"""SpareRoom scraper for extracting listing information"""

import re
import requests
from typing import List, Optional
from bs4 import BeautifulSoup

from .config import config
from .models import SpareRoomAd
from .logger import logger


class SpareRoomScraper:
    """Scraper for SpareRoom listings"""

    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({"User-Agent": config.USER_AGENT})

    def fetch_ads(self, url: str) -> List[SpareRoomAd]:
        """Fetch and parse SpareRoom ads from a given URL"""
        try:
            response = self.session.get(url, timeout=config.REQUEST_TIMEOUT)
            response.raise_for_status()

            html = response.text
            ads = self._parse_ads(html)

            # Sort by ID (descending) to get newest first
            ads.sort(key=lambda ad: int(ad.id), reverse=True)

            logger.debug(f"Fetched {len(ads)} ads from {url}")
            return ads

        except requests.RequestException as e:
            logger.error(f"Error fetching SpareRoom ads: {e}")
            raise

    def _parse_ads(self, html: str) -> List[SpareRoomAd]:
        """Parse HTML and extract all ads"""
        soup = BeautifulSoup(html, "html.parser")
        ads = {}

        # Find all listing items
        for li in soup.find_all("li"):
            # Collect all text from the listing
            raw_text_parts = [el.get_text().strip() for el in li.find_all(string=True) if el.strip()]
            raw_text = " ".join(raw_text_parts)

            # Look for the main ad link
            for anchor in li.find_all("a", href=True):
                href = anchor["href"]

                if "flatshare_detail.pl" in href and "flatshare_id=" in href:
                    match = re.search(r"flatshare_id=(\d+)", href)
                    if match:
                        ad_id = match.group(1)

                        # Build full URL
                        if href.startswith("/"):
                            full_url = f"https://www.spareroom.co.uk{href}"
                        else:
                            full_url = href

                        # Extract title
                        title = anchor.get_text().strip() or "No title found"
                        if len(title) <= 15:
                            title = "No title found"

                        ad = SpareRoomAd(
                            id=ad_id,
                            url=full_url,
                            title=title,
                            price=self._extract_price(raw_text),
                            location=self._extract_location(raw_text),
                            property_type=self._extract_property_type(raw_text),
                            availability=self._extract_availability(raw_text),
                            bills_included=self._extract_bills_included(raw_text),
                            min_term=self._extract_min_term(raw_text),
                            max_term=self._extract_max_term(raw_text),
                            raw_text=raw_text,
                        )

                        ads[ad_id] = ad

        return list(ads.values())

    @staticmethod
    def _extract_price(text: str) -> Optional[str]:
        """Extract price from text"""
        match = re.search(r"£[\d,]+\s*(?:pcm|pw|per month|per week)", text, re.IGNORECASE)
        return match.group(0) if match else None

    @staticmethod
    def _extract_location(text: str) -> Optional[str]:
        """Extract location from text (looks for postcode patterns)"""
        match = re.search(r"([A-Za-z\s]+)\s*\(([A-Z]{1,2}\d{1,2}[A-Z]?)\)", text)
        if match:
            return f"{match.group(1).strip()} ({match.group(2)})"
        return None

    @staticmethod
    def _extract_property_type(text: str) -> Optional[str]:
        """Extract property type from text"""
        patterns = [
            r"\d+\s+bed\s+(?:flat|house|apartment)",
            r"Double\s+room",
            r"Single\s+room",
            r"Studio",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(0)
        return None

    @staticmethod
    def _extract_availability(text: str) -> Optional[str]:
        """Extract availability date from text"""
        match = re.search(
            r"Available\s+(?:Now|(?:\d{1,2}\s+\w+(?:\s+\d{4})?))",
            text,
            re.IGNORECASE,
        )
        return match.group(0) if match else None

    @staticmethod
    def _extract_bills_included(text: str) -> bool:
        """Check if bills are included"""
        return bool(
            re.search(r"bills?\s+included", text, re.IGNORECASE)
            or re.search(r"\(all[- ]in\)", text, re.IGNORECASE)
        )

    @staticmethod
    def _extract_min_term(text: str) -> Optional[str]:
        """Extract minimum rental term"""
        match = re.search(r"Min(?:imum)?\s+(?:term|let)[:\s]+(\d+)\s+months?", text, re.IGNORECASE)
        return f"{match.group(1)} months" if match else None

    @staticmethod
    def _extract_max_term(text: str) -> Optional[str]:
        """Extract maximum rental term"""
        match = re.search(r"Max(?:imum)?\s+(?:term|let)[:\s]+(\d+)\s+months?", text, re.IGNORECASE)
        return f"{match.group(1)} months" if match else None


def get_new_ads(all_ads: List[SpareRoomAd], last_checked_ad_id: Optional[str]) -> List[SpareRoomAd]:
    """Filter ads to get only new ones since last check"""
    if not last_checked_ad_id:
        # If no last checked ID, return empty
        # (don't spam new users with existing ads)
        return []

    last_checked_id_num = int(last_checked_ad_id)
    new_ads = [ad for ad in all_ads if int(ad.id) > last_checked_id_num]

    return new_ads


# Singleton instance
scraper = SpareRoomScraper()
