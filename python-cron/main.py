#!/usr/bin/env python3
"""
SpareRoom Monitor - Cron Job
Checks for new SpareRoom listings and notifies subscribers
"""

import sys
import time
from datetime import datetime

from src.config import config
from src.database import db
from src.scraper import scraper, get_new_ads
from src.email_service import email_service
from src.models import CronResult
from src.logger import logger


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
                # This ensures we retry failed emails on the next run
                newest_ad_id = all_ads[0].id
                db.update_last_checked_ad_id(user.id, newest_ad_id)
                logger.info(f"   Updated last_checked_ad_id to {newest_ad_id}")

                result.successful += 1

            except Exception as email_error:
                logger.error(f"   ❌ Failed to send email to {user.email}: {email_error}")
                result.errors.append(f"{user.email}: Email failed")
                result.failed += 1
                # Don't update last_checked_ad_id - we'll retry these ads next time
                logger.warning(f"   ⚠️  Keeping last_checked_ad_id for retry")
                return

    except Exception as error:
        logger.error(f"❌ Error processing user {user.email}: {error}")
        result.failed += 1
        result.errors.append(f"{user.email}: {str(error)}")


def run_cron_job() -> CronResult:
    """Main cron job execution"""
    logger.info(f"🔄 Cron job started at {datetime.now().isoformat()}")

    result = CronResult()

    try:
        # Validate configuration
        config.validate()

        # Get all active subscribers
        active_users = db.get_active_users()

        if len(active_users) == 0:
            logger.info("No active users to process")
            return result

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

        return result

    except Exception as error:
        logger.error(f"❌ Cron job failed: {error}")
        result.errors.append(f"Fatal error: {str(error)}")
        return result


def main():
    """Entry point for the cron job"""
    try:
        result = run_cron_job()

        # Exit with error code if any failures occurred
        if result.failed > 0:
            sys.exit(1)
        else:
            sys.exit(0)

    except KeyboardInterrupt:
        logger.info("Cron job interrupted by user")
        sys.exit(130)
    except Exception as e:
        logger.error(f"Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
