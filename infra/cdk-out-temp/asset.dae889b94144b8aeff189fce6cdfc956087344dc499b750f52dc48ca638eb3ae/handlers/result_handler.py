"""GET /result/{sid} Lambda 핸들러.

세션 ID 기반으로 분석 결과(스킬 위험도 + 커리어 카드)를 조회한다.

Requirements: 7.1, 7.2, 7.3
"""

import os

import boto3

from utils.logging import get_logger
from utils.response import response

logger = get_logger(__name__)

dynamodb = boto3.resource("dynamodb")

SURVEY_TABLE_NAME = os.environ.get("SURVEY_TABLE_NAME", "")
SKILL_GRAPH_TABLE_NAME = os.environ.get("SKILL_GRAPH_TABLE_NAME", "")
CAREER_CARDS_TABLE_NAME = os.environ.get("CAREER_CARDS_TABLE_NAME", "")


def handler(event: dict, context) -> dict:
    """GET /result/{sid} 요청을 처리한다.

    1. 경로 파라미터에서 session_id 추출
    2. survey 테이블에서 status 확인
    3. status에 따라 적절한 응답 반환
    """
    # 경로 파라미터에서 session_id 추출
    path_params = event.get("pathParameters") or {}
    session_id = path_params.get("sid", "")

    if not session_id:
        return response(400, {"error": "Invalid request", "details": ["세션 ID가 필요합니다"]})

    logger.info("GET /result 요청 수신: session_id=%s", session_id)

    # survey 테이블에서 세션 조회
    survey_table = dynamodb.Table(SURVEY_TABLE_NAME)

    try:
        survey_resp = survey_table.get_item(Key={"session_id": session_id})
    except Exception:
        logger.exception("survey 테이블 조회 실패: session_id=%s", session_id)
        return response(500, {"error": "Internal server error"})

    survey_item = survey_resp.get("Item")

    # 세션 미발견 시 404 반환
    if not survey_item:
        logger.info("세션 미발견: session_id=%s", session_id)
        return response(404, {"error": "Session not found"})

    status = survey_item.get("status", "")

    # 분석 진행 중이면 202 반환
    if status == "analyzing":
        logger.info("분석 진행 중: session_id=%s", session_id)
        return response(202, {"status": "analyzing"})

    # 에러 상태면 500 반환
    if status == "error":
        logger.info("분석 에러 상태: session_id=%s", session_id)
        return response(500, {"error": "Analysis failed"})

    # 분석 완료 시 skill_graph + career_cards 조회
    if status == "completed":
        try:
            skill_risks = _query_skill_risks(session_id)
            career_cards = _query_career_cards(session_id)
        except Exception:
            logger.exception("결과 데이터 조회 실패: session_id=%s", session_id)
            return response(500, {"error": "Internal server error"})

        return response(200, {
            "session_id": session_id,
            "status": "completed",
            "dday": survey_item.get("dday", 0),
            "skill_risks": skill_risks,
            "career_cards": career_cards,
        })

    # 알 수 없는 status
    logger.warning("알 수 없는 status: session_id=%s, status=%s", session_id, status)
    return response(500, {"error": "Internal server error"})


def _query_skill_risks(session_id: str) -> list:
    """skill_graph 테이블에서 세션의 스킬 위험도 데이터를 조회한다."""
    table = dynamodb.Table(SKILL_GRAPH_TABLE_NAME)
    resp = table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("session_id").eq(session_id),
    )
    items = resp.get("Items", [])
    return [
        {
            "skill_name": item.get("skill_name", ""),
            "category": item.get("category", ""),
            "replacement_prob": item.get("replacement_prob", 0),
            "time_horizon": item.get("time_horizon", 0),
            "justification": item.get("justification", ""),
        }
        for item in items
    ]


def _query_career_cards(session_id: str) -> list:
    """career_cards 테이블에서 세션의 커리어 카드 데이터를 조회한다."""
    table = dynamodb.Table(CAREER_CARDS_TABLE_NAME)
    resp = table.query(
        KeyConditionExpression=boto3.dynamodb.conditions.Key("session_id").eq(session_id),
    )
    items = resp.get("Items", [])
    # card_index 기준 정렬
    items.sort(key=lambda x: x.get("card_index", 0))
    return [
        {
            "card_index": item.get("card_index", 0),
            "combo_formula": item.get("combo_formula", ""),
            "reason": item.get("reason", ""),
            "roadmap": item.get("roadmap", []),
        }
        for item in items
    ]
