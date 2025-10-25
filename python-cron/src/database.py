"""Database operations for SpareRoom Monitor"""

import sqlite3
from typing import List, Optional
from contextlib import contextmanager

from .config import config
from .models import User
from .logger import logger


class Database:
    """Database operations manager"""

    def __init__(self, db_path: str = None):
        self.db_path = db_path or config.DATABASE_PATH

    @contextmanager
    def get_connection(self):
        """Context manager for database connections"""
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        except Exception as e:
            conn.rollback()
            raise e
        finally:
            conn.close()

    def get_active_users(self) -> List[User]:
        """Get all active users with subscriptions"""
        with self.get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT id, email, spareroom_url, last_checked_ad_id, active
                FROM users
                WHERE active = 1
                ORDER BY id
                """
            )
            rows = cursor.fetchall()

            users = [
                User(
                    id=row["id"],
                    email=row["email"],
                    spareroom_url=row["spareroom_url"],
                    last_checked_ad_id=row["last_checked_ad_id"],
                    active=bool(row["active"]),
                )
                for row in rows
            ]

            logger.info(f"📊 Found {len(users)} active user(s)")
            return users

    def update_last_checked_ad_id(self, user_id: int, ad_id: str) -> None:
        """Update the last checked ad ID for a user"""
        with self.get_connection() as conn:
            conn.execute(
                """
                UPDATE users
                SET last_checked_ad_id = ?
                WHERE id = ?
                """,
                (ad_id, user_id),
            )
            logger.debug(f"Updated last_checked_ad_id to {ad_id} for user {user_id}")

    def get_user_by_email(self, email: str) -> Optional[User]:
        """Get a user by email address"""
        with self.get_connection() as conn:
            cursor = conn.execute(
                """
                SELECT id, email, spareroom_url, last_checked_ad_id, active
                FROM users
                WHERE email = ?
                """,
                (email,),
            )
            row = cursor.fetchone()

            if row:
                return User(
                    id=row["id"],
                    email=row["email"],
                    spareroom_url=row["spareroom_url"],
                    last_checked_ad_id=row["last_checked_ad_id"],
                    active=bool(row["active"]),
                )
            return None


# Singleton instance
db = Database()
