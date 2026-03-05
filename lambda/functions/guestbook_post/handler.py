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

    # DynamoDB 테이블 참조
    table = dynamodb.Table(GUESTBOOK_TABLE_NAME)

    # session_id 중복 등록 체크 (GSI 사용)
    try:
        existing = table.query(
            IndexName="session_id-index",
            KeyConditionExpression="session_id = :sid",
            ExpressionAttributeValues={":sid": guestbook_req.session_id},
            Limit=1,
            Select="COUNT",
        )
        if existing.get("Count", 0) > 0:
            logger.warning("중복 등록 시도: session_id=%s", guestbook_req.session_id)
            return response(409, {"error": "이미 방명록을 등록하셨습니다."})
    except Exception:
        logger.exception("중복 체크 실패: session_id=%s", guestbook_req.session_id)
        return response(500, {"error": "Internal server error"})

    # DynamoDB에 저장
    entry_id = str(uuid.uuid4())
    created_at = datetime.now(timezone.utc).isoformat()
    item = {
        "entry_id": entry_id,
        "created_at": created_at,
        "gsi_pk": "ALL",  # GSI (created_at-index) 파티션 키
        "session_id": guestbook_req.session_id,
        "job_title": guestbook_req.job_title,
        "remaining_years": str(guestbook_req.remaining_years),
        "message": guestbook_req.message,
        "reactions": {},
    }

    # skills가 있으면 저장
    if guestbook_req.skills:
        item["skills"] = guestbook_req.skills

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
