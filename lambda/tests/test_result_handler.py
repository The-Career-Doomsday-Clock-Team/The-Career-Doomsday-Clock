"""result_handler Lambda 단위 테스트.

moto를 사용하여 DynamoDB를 모킹하고 핸들러 로직을 검증한다.

Requirements: 7.1, 7.2, 7.3
"""

import json
import os
from decimal import Decimal

import boto3
import pytest
from moto import mock_aws


@pytest.fixture
def aws_env(monkeypatch):
    """DynamoDB 테이블 이름 환경변수를 설정한다."""
    monkeypatch.setenv("SURVEY_TABLE_NAME", "survey")
    monkeypatch.setenv("SKILL_GRAPH_TABLE_NAME", "skill_graph")
    monkeypatch.setenv("CAREER_CARDS_TABLE_NAME", "career_cards")


@pytest.fixture
def dynamodb_tables():
    """moto로 DynamoDB 테이블 3개를 생성한다."""
    with mock_aws():
        ddb = boto3.resource("dynamodb", region_name="us-east-1")

        # survey 테이블
        ddb.create_table(
            TableName="survey",
            KeySchema=[{"AttributeName": "session_id", "KeyType": "HASH"}],
            AttributeDefinitions=[{"AttributeName": "session_id", "AttributeType": "S"}],
            BillingMode="PAY_PER_REQUEST",
        )

        # skill_graph 테이블
        ddb.create_table(
            TableName="skill_graph",
            KeySchema=[
                {"AttributeName": "session_id", "KeyType": "HASH"},
                {"AttributeName": "skill_name", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "session_id", "AttributeType": "S"},
                {"AttributeName": "skill_name", "AttributeType": "S"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        # career_cards 테이블
        ddb.create_table(
            TableName="career_cards",
            KeySchema=[
                {"AttributeName": "session_id", "KeyType": "HASH"},
                {"AttributeName": "card_index", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "session_id", "AttributeType": "S"},
                {"AttributeName": "card_index", "AttributeType": "N"},
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        yield ddb


def _make_event(sid: str) -> dict:
    """API Gateway 프록시 이벤트를 생성한다."""
    return {
        "pathParameters": {"sid": sid},
        "httpMethod": "GET",
    }


def test_session_not_found(aws_env, dynamodb_tables):
    """존재하지 않는 세션 ID 조회 시 404를 반환한다. (Requirements 7.2)"""
    from handlers.result_handler import handler

    resp = handler(_make_event("nonexistent-session-id"), None)
    assert resp["statusCode"] == 404
    body = json.loads(resp["body"])
    assert body["error"] == "Session not found"


def test_analyzing_status_returns_202(aws_env, dynamodb_tables):
    """분석 진행 중이면 202를 반환한다. (Requirements 7.3)"""
    table = dynamodb_tables.Table("survey")
    table.put_item(Item={"session_id": "test-sid", "status": "analyzing"})

    from handlers.result_handler import handler

    resp = handler(_make_event("test-sid"), None)
    assert resp["statusCode"] == 202
    body = json.loads(resp["body"])
    assert body["status"] == "analyzing"


def test_completed_returns_full_result(aws_env, dynamodb_tables):
    """분석 완료 시 스킬 위험도 + 커리어 카드를 200으로 반환한다. (Requirements 7.1)"""
    # survey 데이터 삽입
    survey_table = dynamodb_tables.Table("survey")
    survey_table.put_item(Item={
        "session_id": "test-sid",
        "status": "completed",
        "dday": Decimal("5"),
    })

    # skill_graph 데이터 삽입
    skill_table = dynamodb_tables.Table("skill_graph")
    skill_table.put_item(Item={
        "session_id": "test-sid",
        "skill_name": "코딩",
        "category": "기술",
        "replacement_prob": Decimal("75"),
        "time_horizon": Decimal("3"),
        "justification": "AI가 코딩을 대체할 수 있다",
    })

    # career_cards 데이터 삽입
    cards_table = dynamodb_tables.Table("career_cards")
    cards_table.put_item(Item={
        "session_id": "test-sid",
        "card_index": Decimal("0"),
        "combo_formula": "[개발자] + [분석력] + [게임] = [게임 디자이너]",
        "reason": "추천 사유",
        "roadmap": [{"step": "1단계", "duration": "3개월"}],
    })

    from handlers.result_handler import handler

    resp = handler(_make_event("test-sid"), None)
    assert resp["statusCode"] == 200

    body = json.loads(resp["body"])
    assert body["session_id"] == "test-sid"
    assert body["status"] == "completed"
    assert body["dday"] == 5
    assert len(body["skill_risks"]) == 1
    assert body["skill_risks"][0]["skill_name"] == "코딩"
    assert body["skill_risks"][0]["replacement_prob"] == 75
    assert len(body["career_cards"]) == 1
    assert body["career_cards"][0]["card_index"] == 0
    assert body["career_cards"][0]["combo_formula"] == "[개발자] + [분석력] + [게임] = [게임 디자이너]"


def test_missing_sid_returns_400(aws_env, dynamodb_tables):
    """세션 ID가 없으면 400을 반환한다."""
    from handlers.result_handler import handler

    resp = handler({"pathParameters": {}}, None)
    assert resp["statusCode"] == 400
