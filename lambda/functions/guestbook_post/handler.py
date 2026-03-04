"""POST /guestbook Lambda 핸들러.

방명록 항목을 검증하고 DynamoDB guestbook 테이블에 저장한다.

Requirements: 8.1, 8.4
"""

import json
import os
import uuid
from datetime import datetime, timezone

import boto3
from pydantic import ValidationError

from models.schemas import GuestbookRequest
from utils.logging import get_logger
from utils.response import response

logger = get_logger(__name__)

dynamodb = boto3.resource("dynamodb")

GUESTBOOK_TABLE_NAME = os.environ.get("GUESTBOOK_TABLE_NAME", "")


def handler(event: dict, context) -> dict:
    """POST /guestbook 요청을 처리한다.

    1. 요청 본문을 파싱하고 Pydantic으로 유효성 검증
    2. 빈 메시지 / 공백만 메시지 거부
    3. DynamoDB guestbook 테이블에 저장
    """
    logger.info("POST /guestbook 요청 수신")

    # 요청 본문 파싱
    try:
        body = json.loads(event.get("body") or "{}")
    except (json.JSONDecodeError, TypeError):
        logger.warning("잘못된 JSON 요청 본문")
        return response(400, {"error": "Invalid request", "details": ["잘못된 JSON 형식"]})

    # Pydantic 유효성 검증 (빈 메시지 / 공백만 메시지는 모델에서 거부)
    try:
        guestbook_req = GuestbookRequest(**body)
    except ValidationError as e:
        logger.warning("방명록 유효성 검증 실패: %s", e.errors())
        # Pydantic 에러를 직렬화 가능한 형태로 변환
        details = [
            {"field": ".".join(str(loc) for loc in err.get("loc", ())), "msg": err.get("msg", "")}
            for err in e.errors()
        ]
        return response(400, {"error": "Invalid request", "details": details})

    # DynamoDB에 저장
    entry_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()

    table = dynamodb.Table(GUESTBOOK_TABLE_NAME)
    item = {
        "entry_id": entry_id,
        "created_at": created_at,
        "gsi_pk": "ALL",  # GSI (created_at-index) 파티션 키
        "session_id": guestbook_req.session_id,
        "job_title": guestbook_req.job_title,
        "dday": str(guestbook_req.dday),
        "message": guestbook_req.message,
        "reactions": {},
    }

    try:
        table.put_item(Item=item)
        logger.info("방명록 저장 완료: entry_id=%s", entry_id)
    except Exception:
        logger.exception("DynamoDB 쓰기 실패: entry_id=%s", entry_id)
        return response(500, {"error": "Internal server error"})

    return response(200, {
        "entry_id": entry_id,
        "created_at": created_at,
    })
