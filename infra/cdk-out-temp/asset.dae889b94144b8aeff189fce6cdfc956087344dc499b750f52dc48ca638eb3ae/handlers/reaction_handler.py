"""POST /guestbook/{id}/reaction Lambda 핸들러.

방명록 항목에 이모지 반응을 원자적으로 추가한다.

Requirements: 8.3
"""

import json
import os

import boto3
from pydantic import ValidationError

from models.schemas import ReactionRequest
from utils.logging import get_logger
from utils.response import response

logger = get_logger(__name__)

dynamodb = boto3.resource("dynamodb")

GUESTBOOK_TABLE_NAME = os.environ.get("GUESTBOOK_TABLE_NAME", "")


def handler(event: dict, context) -> dict:
    """POST /guestbook/{id}/reaction 요청을 처리한다.

    1. 경로 파라미터에서 entry_id 추출
    2. 요청 본문에서 emoji, created_at 파싱
    3. DynamoDB ADD 연산으로 이모지 카운트 원자적 증가
    4. 업데이트된 reactions 맵 반환
    """
    # 경로 파라미터에서 entry_id 추출
    path_params = event.get("pathParameters") or {}
    entry_id = path_params.get("id", "")

    if not entry_id:
        return response(400, {"error": "Invalid request", "details": ["entry_id가 필요합니다"]})

    logger.info("POST /guestbook/%s/reaction 요청 수신", entry_id)

    # 요청 본문 파싱
    try:
        body = json.loads(event.get("body") or "{}")
    except (json.JSONDecodeError, TypeError):
        logger.warning("잘못된 JSON 요청 본문")
        return response(400, {"error": "Invalid request", "details": ["잘못된 JSON 형식"]})

    # Pydantic 유효성 검증
    try:
        reaction_req = ReactionRequest(**body)
    except ValidationError as e:
        logger.warning("반응 유효성 검증 실패: %s", e.errors())
        details = [
            {"field": ".".join(str(loc) for loc in err.get("loc", ())), "msg": err.get("msg", "")}
            for err in e.errors()
        ]
        return response(400, {"error": "Invalid request", "details": details})

    # created_at은 복합 키의 SK이므로 요청 본문에서 받는다
    created_at = body.get("created_at", "")
    if not created_at:
        return response(400, {"error": "Invalid request", "details": ["created_at이 필요합니다"]})

    # DynamoDB ADD 연산으로 이모지 카운트 원자적 증가
    table = dynamodb.Table(GUESTBOOK_TABLE_NAME)

    try:
        update_resp = table.update_item(
            Key={
                "entry_id": entry_id,
                "created_at": created_at,
            },
            UpdateExpression="ADD reactions.#emoji :inc",
            ExpressionAttributeNames={
                "#emoji": reaction_req.emoji,
            },
            ExpressionAttributeValues={
                ":inc": 1,
            },
            ReturnValues="ALL_NEW",
        )
    except dynamodb.meta.client.exceptions.ClientError as e:
        logger.exception("DynamoDB 업데이트 실패: entry_id=%s", entry_id)
        return response(500, {"error": "Internal server error"})
    except Exception:
        logger.exception("DynamoDB 업데이트 실패: entry_id=%s", entry_id)
        return response(500, {"error": "Internal server error"})

    updated_item = update_resp.get("Attributes", {})
    reactions = updated_item.get("reactions", {})

    return response(200, {"reactions": reactions})
