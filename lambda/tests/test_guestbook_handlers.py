"""방명록 Lambda 핸들러 단위 테스트.

moto를 사용하여 DynamoDB를 모킹하고 핸들러 로직을 검증한다.

Requirements: 8.1, 8.2, 8.3, 8.4
"""

import base64
import json
import os
import time

import boto3
import pytest
from moto import mock_aws


@pytest.fixture
def aws_env(monkeypatch):
    """DynamoDB 테이블 이름 환경변수를 설정한다."""
    monkeypatch.setenv("GUESTBOOK_TABLE_NAME", "guestbook")


@pytest.fixture
def guestbook_table():
    """moto로 guestbook DynamoDB 테이블을 생성한다."""
    with mock_aws():
        ddb = boto3.resource("dynamodb", region_name="us-east-1")

        ddb.create_table(
            TableName="guestbook",
            KeySchema=[
                {"AttributeName": "entry_id", "KeyType": "HASH"},
                {"AttributeName": "created_at", "KeyType": "RANGE"},
            ],
            AttributeDefinitions=[
                {"AttributeName": "entry_id", "AttributeType": "S"},
                {"AttributeName": "created_at", "AttributeType": "S"},
                {"AttributeName": "gsi_pk", "AttributeType": "S"},
            ],
            GlobalSecondaryIndexes=[
                {
                    "IndexName": "created_at-index",
                    "KeySchema": [
                        {"AttributeName": "gsi_pk", "KeyType": "HASH"},
                        {"AttributeName": "created_at", "KeyType": "RANGE"},
                    ],
                    "Projection": {"ProjectionType": "ALL"},
                },
            ],
            BillingMode="PAY_PER_REQUEST",
        )

        yield ddb


def _make_post_event(body: dict) -> dict:
    """POST /guestbook API Gateway 프록시 이벤트를 생성한다."""
    return {
        "httpMethod": "POST",
        "body": json.dumps(body),
    }


def _make_get_event(query_params: dict = None) -> dict:
    """GET /guestbook API Gateway 프록시 이벤트를 생성한다."""
    return {
        "httpMethod": "GET",
        "queryStringParameters": query_params,
    }


def _make_reaction_event(entry_id: str, body: dict) -> dict:
    """POST /guestbook/{id}/reaction API Gateway 프록시 이벤트를 생성한다."""
    return {
        "httpMethod": "POST",
        "pathParameters": {"id": entry_id},
        "body": json.dumps(body),
    }


# ── guestbook_post_handler 테스트 ──


class TestGuestbookPostHandler:
    """POST /guestbook 핸들러 테스트."""

    def test_valid_post_returns_200(self, aws_env, guestbook_table):
        """유효한 방명록 등록 시 200과 entry_id를 반환한다. (Requirements 8.1)"""
        from handlers.guestbook_post_handler import handler

        event = _make_post_event({
            "session_id": "test-sid",
            "job_title": "개발자",
            "remaining_years": 5,
            "message": "AI가 무섭다",
        })
        resp = handler(event, None)
        assert resp["statusCode"] == 200

        body = json.loads(resp["body"])
        assert "entry_id" in body
        assert "created_at" in body

    def test_empty_message_returns_400(self, aws_env, guestbook_table):
        """빈 메시지 등록 시 400을 반환한다. (Requirements 8.4)"""
        from handlers.guestbook_post_handler import handler

        event = _make_post_event({
            "session_id": "test-sid",
            "job_title": "개발자",
            "remaining_years": 5,
            "message": "",
        })
        resp = handler(event, None)
        assert resp["statusCode"] == 400

    def test_whitespace_message_returns_400(self, aws_env, guestbook_table):
        """공백만 메시지 등록 시 400을 반환한다. (Requirements 8.4)"""
        from handlers.guestbook_post_handler import handler

        event = _make_post_event({
            "session_id": "test-sid",
            "job_title": "개발자",
            "remaining_years": 5,
            "message": "   ",
        })
        resp = handler(event, None)
        assert resp["statusCode"] == 400

    def test_invalid_json_returns_400(self, aws_env, guestbook_table):
        """잘못된 JSON 요청 시 400을 반환한다."""
        from handlers.guestbook_post_handler import handler

        event = {"httpMethod": "POST", "body": "not-json"}
        resp = handler(event, None)
        assert resp["statusCode"] == 400


# ── guestbook_get_handler 테스트 ──


class TestGuestbookGetHandler:
    """GET /guestbook 핸들러 테스트."""

    def test_empty_guestbook_returns_empty_list(self, aws_env, guestbook_table):
        """빈 방명록 조회 시 빈 목록을 반환한다. (Requirements 8.2)"""
        from handlers.guestbook_get_handler import handler

        resp = handler(_make_get_event(), None)
        assert resp["statusCode"] == 200

        body = json.loads(resp["body"])
        assert body["items"] == []
        assert body["last_key"] is None

    def test_returns_items_newest_first(self, aws_env, guestbook_table):
        """방명록 항목을 최신순으로 반환한다. (Requirements 8.2)"""
        table = guestbook_table.Table("guestbook")

        # 시간 순서대로 2개 항목 삽입
        table.put_item(Item={
            "entry_id": "e1",
            "created_at": "2025-01-01T00:00:00+00:00",
            "gsi_pk": "ALL",
            "session_id": "s1",
            "job_title": "개발자",
            "dday": "3",
            "message": "첫 번째",
            "reactions": {},
        })
        table.put_item(Item={
            "entry_id": "e2",
            "created_at": "2025-01-02T00:00:00+00:00",
            "gsi_pk": "ALL",
            "session_id": "s2",
            "job_title": "디자이너",
            "remaining_years": "7",
            "message": "두 번째",
            "reactions": {},
        })

        from handlers.guestbook_get_handler import handler

        resp = handler(_make_get_event(), None)
        assert resp["statusCode"] == 200

        body = json.loads(resp["body"])
        assert len(body["items"]) == 2
        # 최신순: e2가 먼저
        assert body["items"][0]["entry_id"] == "e2"
        assert body["items"][1]["entry_id"] == "e1"


# ── reaction_handler 테스트 ──


class TestReactionHandler:
    """POST /guestbook/{id}/reaction 핸들러 테스트."""

    def test_add_reaction_returns_updated_counts(self, aws_env, guestbook_table):
        """이모지 반응 추가 시 업데이트된 카운트를 반환한다. (Requirements 8.3)"""
        table = guestbook_table.Table("guestbook")
        table.put_item(Item={
            "entry_id": "e1",
            "created_at": "2025-01-01T00:00:00+00:00",
            "gsi_pk": "ALL",
            "session_id": "s1",
            "job_title": "개발자",
            "dday": "3",
            "message": "테스트",
            "reactions": {},
        })

        from handlers.reaction_handler import handler

        event = _make_reaction_event("e1", {
            "emoji": "😱",
            "created_at": "2025-01-01T00:00:00+00:00",
        })
        resp = handler(event, None)
        assert resp["statusCode"] == 200

        body = json.loads(resp["body"])
        assert body["reactions"]["😱"] == 1

    def test_missing_entry_id_returns_400(self, aws_env, guestbook_table):
        """entry_id 누락 시 400을 반환한다."""
        from handlers.reaction_handler import handler

        event = {
            "httpMethod": "POST",
            "pathParameters": {},
            "body": json.dumps({"emoji": "😱", "created_at": "2025-01-01T00:00:00+00:00"}),
        }
        resp = handler(event, None)
        assert resp["statusCode"] == 400

    def test_missing_emoji_returns_400(self, aws_env, guestbook_table):
        """emoji 누락 시 400을 반환한다."""
        from handlers.reaction_handler import handler

        event = _make_reaction_event("e1", {"created_at": "2025-01-01T00:00:00+00:00"})
        resp = handler(event, None)
        assert resp["statusCode"] == 400
