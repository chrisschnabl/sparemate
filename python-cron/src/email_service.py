"""Email service for sending notifications via Resend"""

import resend
from typing import List

from .config import config
from .models import SpareRoomAd
from .logger import logger


class EmailService:
    """Service for sending email notifications"""

    def __init__(self):
        if not config.RESEND_API_KEY:
            raise ValueError("RESEND_API_KEY is not configured")
        resend.api_key = config.RESEND_API_KEY

    def send_new_listings_email(self, to_email: str, ads: List[SpareRoomAd]) -> None:
        """Send email notification about new listings"""
        if not ads:
            logger.warning("No ads to send in email")
            return

        # Build email content
        subject = f"🏠 {len(ads)} new SpareRoom listing{'s' if len(ads) > 1 else ''}"

        # HTML content
        html_body = self._build_html_email(ads)

        # Text content (fallback)
        text_body = self._build_text_email(ads)

        try:
            params = {
                "from": config.EMAIL_FROM,
                "to": [to_email],
                "subject": subject,
                "html": html_body,
                "text": text_body,
            }

            response = resend.Emails.send(params)
            logger.info(f"✅ Email sent to {to_email} (ID: {response.get('id', 'unknown')})")

        except Exception as e:
            logger.error(f"❌ Failed to send email to {to_email}: {e}")
            raise

    def _build_html_email(self, ads: List[SpareRoomAd]) -> str:
        """Build HTML email content"""
        ad_blocks = []

        for ad in ads:
            price_str = ad.price or "Price not listed"
            if ad.bills_included and ad.price:
                price_str += " (bills included)"

            # Build property details
            details = []
            if ad.location:
                details.append(f"📍 {ad.location}")
            if ad.property_type:
                details.append(f"🏘️ {ad.property_type}")
            if ad.availability:
                details.append(f"📅 {ad.availability}")

            details_html = "<br>".join(details) if details else ""

            # Build term info
            term_html = ""
            if ad.min_term or ad.max_term:
                term_parts = []
                if ad.min_term:
                    term_parts.append(f"min {ad.min_term}")
                if ad.max_term:
                    term_parts.append(f"max {ad.max_term}")
                term_html = f"<p style='margin: 5px 0; color: #666;'>Term: {', '.join(term_parts)}</p>"

            ad_html = f"""
            <div style="border: 1px solid #ddd; border-radius: 8px; padding: 16px; margin-bottom: 16px; background-color: #f9f9f9;">
                <h3 style="margin: 0 0 8px 0;">
                    <a href="{ad.url}" style="color: #0066cc; text-decoration: none;">{ad.title}</a>
                </h3>
                <p style="margin: 5px 0; font-size: 18px; font-weight: bold; color: #2c5f2d;">{price_str}</p>
                {f'<p style="margin: 5px 0;">{details_html}</p>' if details_html else ''}
                {term_html}
                <p style="margin: 10px 0 0 0;">
                    <a href="{ad.url}" style="display: inline-block; padding: 8px 16px; background-color: #0066cc; color: white; text-decoration: none; border-radius: 4px;">View Listing</a>
                </p>
            </div>
            """
            ad_blocks.append(ad_html)

        ads_html = "\n".join(ad_blocks)

        return f"""
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
            <h2 style="color: #333;">New SpareRoom Listings</h2>
            <p>We found {len(ads)} new listing{'s' if len(ads) > 1 else ''} matching your search:</p>
            {ads_html}
            <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
            <p style="font-size: 12px; color: #666;">
                You're receiving this email because you subscribed to SpareRoom Monitor.
            </p>
        </body>
        </html>
        """

    def _build_text_email(self, ads: List[SpareRoomAd]) -> str:
        """Build plain text email content"""
        ad_texts = []

        for ad in ads:
            ad_texts.append(ad.format_for_email())
            ad_texts.append("-" * 50)

        ads_text = "\n\n".join(ad_texts)

        return f"""
New SpareRoom Listings

We found {len(ads)} new listing{'s' if len(ads) > 1 else ''} matching your search:

{ads_text}

---
You're receiving this email because you subscribed to SpareRoom Monitor.
        """.strip()


# Singleton instance
email_service = EmailService()
