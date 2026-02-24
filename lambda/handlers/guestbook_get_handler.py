"""GET /guestbook Lambda 핸들러.

방명록 목록을 최신순으로 페이지네이션하여 조회한다.

Requirements: 8.2
"""

import base64
import json
import os

import boto3
from boto3.dynamodb.conditions import Key

from utils.logging import get_logger
from utils.response import response

logger = get_logger(__name__)

dynamodb = boto3.resource("dynamodb")

GUESTBOOK_TABLE_NAME = os.environ.get("GUESTBOOK_TABLE_NAME", "")

DEFAULT_LIMIT = 20
MAX_LIMIT = 100


def handler(event: dict, context) -> dict:
    """GET /guestbook 요청을 처리한다.

    1. 쿼리 파라미터에서 limit, last_key 파싱
    2. GSI (created_at-index) 사용하여 최신순 조회
    3. 페이지네이션 (last_key 기반)
    """
    logger.info("GET /guestbook 요청 수신")

    query_params = event.get("queryStringParameters") or {}

    # limit 파싱
    try:
        limit = int(query_params.get("limit", DEFAULT_LIMIT))
        limit = max(1, min(limit, MAX_LIMIT))
    except (ValueError, TypeError):
        limit = DEFAULT_LIMIT

    # last_key 파싱 (base64 인코딩된 JSON)
    exclusive_start_key = None
    last_key_param = query_params.get("last_key")
    if last_key_param:
        try:
            decoded = base64.b64decode(last_key_param)
            exclusive_start_key = json.loads(decoded)
        except (ValueError, json.JSONDecodeError, Exception):
            logger.warning("잘못된 last_key 파라미터: %s", last_key_param)
            return response(400, {"error": "Invalid request", "details": ["잘못된 last_key 형식"]})

    # GSI 쿼리 (최신순 = ScanIndexForward=False)
    table = dynamodb.Table(GUESTBOOK_TABLE_NAME)

    query_kwargs = {
        "IndexName": "created_at-index",
        "KeyConditionExpression": Key("gsi_pk").eq("ALL"),
        "ScanIndexForward": False,
        "Limit": limit,
    }

    if exclusive_start_key:
        query_kwargs["ExclusiveStartKey"] = exclusive_start_key

    try:
        resp = table.query(**query_kwargs)
    except Exception:
        logger.exception("방명록 조회 실패")
        return response(500, {"error": "Internal server error"})

    items = resp.get("Items", [])

    # last_key 인코딩 (다음 페이지용)
    last_evaluated_key = resp.get("LastEvaluatedKey")
    encoded_last_key = None
    if last_evaluated_key:
        encoded_last_key = base64.b64encode(
            json.dumps(last_evaluated_key, default=str).encode()
        ).decode()

    return response(200, {
        "items": items,
        "last_key": encoded_last_key,
    })
