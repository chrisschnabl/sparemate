"""
Vercel Serverless Function for SpareRoom Monitor Cron Job
This function is triggered by Vercel Cron
"""

import os
import sys
import json
from http.server import BaseHTTPRequestHandler

# Add parent directory to path so we can import src modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.config import config
from src.database import db
from src.scraper import scraper, get_new_ads
from src.email_service import email_service
from src.models import CronResult
from src.logger import logger
import time


def process_user(user, result: CronResult) -> None:
    """Process a single user's subscription"""
    result.processed += 1

    try:
        # Skip users without a Spareroom URL
        if not user.spareroom_url:
            logger.warning(f"⚠️  User {user.email} has no Spareroom URL, skipping")
            result.failed += 1
            result.errors.append(f"{user.email}: No Spareroom URL")
            return

        logger.info(f"🔍 Checking listings for {user.email}...")

        # Fetch all ads from the user's Spareroom URL
        all_ads = scraper.fetch_ads(user.spareroom_url)
        logger.info(f"   Found {len(all_ads)} total ads")

        if len(all_ads) == 0:
            logger.info(f"   No ads found for {user.email}")
            result.successful += 1
            return

        # Find new ads since last check
        new_ads = get_new_ads(all_ads, user.last_checked_ad_id)

        if len(new_ads) == 0:
            logger.info(f"   No new ads for {user.email}")

            # Update last checked ad ID to current newest (no email needed)
            newest_ad_id = all_ads[0].id
            db.update_last_checked_ad_id(user.id, newest_ad_id)
            logger.info(f"   Updated last_checked_ad_id to {newest_ad_id}")

            result.successful += 1
        else:
            logger.info(f"   🆕 {len(new_ads)} new ad(s) for {user.email}")

            # Send email notification
            try:
                email_service.send_new_listings_email(user.email, new_ads)
                result.notifications += 1

                # Only update last_checked_ad_id if email was sent successfully
                newest_ad_id = all_ads[0].id
                db.update_last_checked_ad_id(user.id, newest_ad_id)
                logger.info(f"   Updated last_checked_ad_id to {newest_ad_id}")

                result.successful += 1

            except Exception as email_error:
                logger.error(f"   ❌ Failed to send email to {user.email}: {email_error}")
                result.errors.append(f"{user.email}: Email failed")
                result.failed += 1
                logger.warning(f"   ⚠️  Keeping last_checked_ad_id for retry")
                return

    except Exception as error:
        logger.error(f"❌ Error processing user {user.email}: {error}")
        result.failed += 1
        result.errors.append(f"{user.email}: {str(error)}")


def run_cron_job() -> dict:
    """Main cron job execution"""
    from datetime import datetime

    logger.info(f"🔄 Cron job started at {datetime.now().isoformat()}")

    result = CronResult()

    try:
        # Validate configuration
        config.validate()

        # Get all active subscribers
        active_users = db.get_active_users()

        if len(active_users) == 0:
            logger.info("No active users to process")
            return {
                "success": True,
                "message": "No active users to process",
                "timestamp": datetime.now().isoformat(),
                **result.to_dict(),
            }

        # Process each user
        for i, user in enumerate(active_users):
            process_user(user, result)

            # Add a small delay between users to avoid rate limiting
            if i < len(active_users) - 1:
                time.sleep(config.DELAY_BETWEEN_USERS)

        logger.info("✅ Cron job completed")
        logger.info(f"   Processed: {result.processed}")
        logger.info(f"   Successful: {result.successful}")
        logger.info(f"   Failed: {result.failed}")
        logger.info(f"   Notifications sent: {result.notifications}")

        return {
            "success": True,
            "timestamp": datetime.now().isoformat(),
            **result.to_dict(),
        }

    except Exception as error:
        logger.error(f"❌ Cron job failed: {error}")
        return {
            "success": False,
            "error": str(error),
            "timestamp": datetime.now().isoformat(),
        }


class handler(BaseHTTPRequestHandler):
    """Vercel serverless function handler"""

    def do_GET(self):
        """Handle GET requests from Vercel Cron"""

        # Verify this request is from Vercel Cron or authorized manually
        user_agent = self.headers.get('user-agent', '')
        auth_header = self.headers.get('authorization', '')

        # Allow requests from:
        # 1. Vercel Cron (has vercel-cron user agent)
        # 2. Manual testing with CRON_SECRET (authorization header)
        is_vercel_cron = 'vercel-cron' in user_agent.lower()
        cron_secret = os.getenv('CRON_SECRET', '')
        is_authorized = auth_header == f'Bearer {cron_secret}' if cron_secret else False

        if not is_vercel_cron and not is_authorized:
            self.send_response(401)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({"error": "Unauthorized"}).encode())
            return

        try:
            # Run the cron job
            result = run_cron_job()

            # Send response
            status_code = 200 if result.get("success") else 500
            self.send_response(status_code)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps(result, indent=2).encode())

        except Exception as e:
            logger.error(f"Handler error: {e}")
            self.send_response(500)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(json.dumps({
                "success": False,
                "error": str(e)
            }).encode())
