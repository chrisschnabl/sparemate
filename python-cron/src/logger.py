"""Logging configuration for SpareRoom Monitor"""

import logging
import sys
from .config import config


def setup_logger(name: str = "spareroom_monitor") -> logging.Logger:
    """Configure and return a logger instance"""
    logger = logging.getLogger(name)
    logger.setLevel(getattr(logging, config.LOG_LEVEL.upper()))

    # Console handler
    handler = logging.StreamHandler(sys.stdout)
    handler.setLevel(getattr(logging, config.LOG_LEVEL.upper()))

    # Format with emoji for better readability
    formatter = logging.Formatter(
        "%(asctime)s - %(levelname)s - %(message)s",
        datefmt="%Y-%m-%d %H:%M:%S"
    )
    handler.setFormatter(formatter)

    # Remove existing handlers and add our handler
    logger.handlers = []
    logger.addHandler(handler)

    return logger


logger = setup_logger()
