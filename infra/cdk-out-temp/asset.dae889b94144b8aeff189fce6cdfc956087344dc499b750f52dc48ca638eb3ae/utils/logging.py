"""Shared logging configuration for Lambda handlers."""

import logging
import os


def get_logger(name: str) -> logging.Logger:
    """Create a configured logger instance.

    Log level is controlled by the LOG_LEVEL environment variable
    (default: INFO).

    Args:
        name: Logger name, typically __name__ of the calling module.

    Returns:
        Configured logging.Logger instance.
    """
    logger = logging.getLogger(name)
    level = os.environ.get("LOG_LEVEL", "INFO").upper()
    logger.setLevel(getattr(logging, level, logging.INFO))

    if not logger.handlers:
        handler = logging.StreamHandler()
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s [%(levelname)s] %(name)s — %(message)s"
            )
        )
        logger.addHandler(handler)

    return logger
