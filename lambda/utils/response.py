"""Shared HTTP response helper for Lambda handlers."""

import json
from decimal import Decimal
from typing import Any


class DecimalEncoder(json.JSONEncoder):
    """JSON encoder that handles Decimal types from DynamoDB."""

    def default(self, o: Any) -> Any:
        if isinstance(o, Decimal):
            if o % 1 == 0:
                return int(o)
            return float(o)
        return super().default(o)


def response(status_code: int, body: Any) -> dict:
    """Build a standard API Gateway proxy response.

    Args:
        status_code: HTTP status code.
        body: Response payload (will be JSON-serialized).

    Returns:
        API Gateway Lambda proxy integration response dict.
    """
    return {
        "statusCode": status_code,
        "headers": {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        },
        "body": json.dumps(body, cls=DecimalEncoder, ensure_ascii=False),
    }
