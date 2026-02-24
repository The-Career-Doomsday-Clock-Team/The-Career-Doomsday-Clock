"""POST /survey Lambda 핸들러.

설문 데이터를 검증하고 DynamoDB에 저장한 뒤,
analyze_handler를 비동기로 호출한다.

Requirements: 3.1, 10.4
"""

import json
import os
from datetime import datetime, timezone

import boto3

from models.schemas import SurveyRequest
from services.validation import SurveyValidationError, validate_survey
from utils.logging import get_logger
from utils.response import response

logger = get_logger(__name__)

dynamodb = boto3.resource("dynamodb")
lambda_client = boto3.client("lambda")

SURVEY_TABLE_NAME = os.environ.get("SURVEY_TABLE_NAME", "")
ANALYZE_FUNCTION_NAME = os.environ.get("ANALYZE_FUNCTION_NAME", "")


def handler(event: dict, context) -> dict:
    """POST /survey 요청을 처리한다.

    1. 요청 본문을 파싱하고 Pydantic으로 유효성 검증
    2. DynamoDB survey 테이블에 status='analyzing'으로 저장
    3. analyze_handler Lambda를 비동기(Event) 호출
    """
    logger.info("POST /survey 요청 수신")

    # 요청 본문 파싱
    try:
        body = json.loads(event.get("body") or "{}")
    except (json.JSONDecodeError, TypeError):
        logger.warning("잘못된 JSON 요청 본문")
        return response(400, {"error": "Invalid request", "details": ["잘못된 JSON 형식"]})

    # Pydantic 유효성 검증
    try:
        survey: SurveyRequest = validate_survey(body)
    except SurveyValidationError as e:
        logger.warning("설문 유효성 검증 실패: %s", e.missing_fields)
        return response(400, {
            "error": "Invalid request",
            "details": [f"필수 항목 누락 또는 빈 값: {', '.join(e.missing_fields)}"],
        })

    # DynamoDB에 저장 (status: analyzing)
    table = dynamodb.Table(SURVEY_TABLE_NAME)
    item = {
        "session_id": survey.session_id,
        "name": survey.name,
        "job_title": survey.job_title,
        "strengths": survey.strengths,
        "hobbies": survey.hobbies,
        "status": "analyzing",
        "created_at": datetime.now(timezone.utc).isoformat(),
    }

    try:
        table.put_item(Item=item)
        logger.info("설문 저장 완료: session_id=%s", survey.session_id)
    except Exception:
        logger.exception("DynamoDB 쓰기 실패: session_id=%s", survey.session_id)
        return response(500, {"error": "Internal server error"})

    # analyze_handler 비동기 호출
    try:
        lambda_client.invoke(
            FunctionName=ANALYZE_FUNCTION_NAME,
            InvocationType="Event",  # 비동기 호출
            Payload=json.dumps({
                "session_id": survey.session_id,
                "name": survey.name,
                "job_title": survey.job_title,
                "strengths": survey.strengths,
                "hobbies": survey.hobbies,
            }),
        )
        logger.info("analyze_handler 비동기 호출 완료: session_id=%s", survey.session_id)
    except Exception:
        logger.exception("analyze_handler 호출 실패: session_id=%s", survey.session_id)
        # 분석 호출 실패 시 status를 error로 업데이트
        try:
            table.update_item(
                Key={"session_id": survey.session_id},
                UpdateExpression="SET #s = :s",
                ExpressionAttributeNames={"#s": "status"},
                ExpressionAttributeValues={":s": "error"},
            )
        except Exception:
            logger.exception("status 업데이트 실패")
        return response(500, {"error": "Internal server error"})

    return response(200, {
        "session_id": survey.session_id,
        "status": "analyzing",
    })
