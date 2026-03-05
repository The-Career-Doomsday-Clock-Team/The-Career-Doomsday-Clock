"""GET /ranking Lambda 핸들러.

survey 테이블에서 직업별 D-Day 평균을 집계하여 랭킹을 반환한다.

Requirements: 3.1, 3.3
"""

import os
from collections import defaultdict
from decimal import Decimal

import boto3

from utils.logging import get_logger
from utils.response import response

logger = get_logger(__name__)

dynamodb = boto3.resource("dynamodb")

SURVEY_TABLE_NAME = os.environ.get("SURVEY_TABLE_NAME", "")

# 최소 제출 수 (이 미만인 직업은 제외)
MIN_SUBMISSIONS = 2


def aggregate_rankings(items: list[dict]) -> list[dict]:
    """survey 항목 리스트에서 직업별 D-Day 평균을 집계한다.

    - status=completed인 항목만 대상
    - job_title별 평균 dday 계산
    - count < MIN_SUBMISSIONS인 직업 제외
    - avg_dday 오름차순 정렬 (위험도 높은 직업이 상단)
    """
    # job_title별 dday 값 수집
    job_data: dict[str, list[float]] = defaultdict(list)

    for item in items:
        status = item.get("status", "")
        if status != "completed":
            continue

        job_title = item.get("job_title", "").strip()
        if not job_title:
            continue

        dday_raw = item.get("dday")
        if dday_raw is None:
            continue

        try:
            dday_val = float(dday_raw) if isinstance(dday_raw, (Decimal, str)) else float(dday_raw)
        except (ValueError, TypeError):
            continue

        job_data[job_title].append(dday_val)

    # 집계: count >= MIN_SUBMISSIONS인 직업만 포함
    rankings = []
    for job_title, ddays in job_data.items():
        count = len(ddays)
        if count < MIN_SUBMISSIONS:
            continue
        avg_dday = round(sum(ddays) / count, 1)
        rankings.append({
            "job_title": job_title,
            "avg_dday": avg_dday,
            "count": count,
        })

    # avg_dday 오름차순 정렬 (위험도 높은 직업이 상단)
    rankings.sort(key=lambda x: x["avg_dday"])

    return rankings


def handler(event: dict, context) -> dict:
    """GET /ranking 요청을 처리한다.

    survey 테이블을 스캔하여 직업별 D-Day 통계를 집계한다.
    """
    logger.info("GET /ranking 요청 수신")

    table = dynamodb.Table(SURVEY_TABLE_NAME)

    try:
        # 전체 스캔 (소규모 데이터 가정)
        all_items: list[dict] = []
        scan_kwargs: dict = {}

        while True:
            resp = table.scan(**scan_kwargs)
            all_items.extend(resp.get("Items", []))

            last_key = resp.get("LastEvaluatedKey")
            if not last_key:
                break
            scan_kwargs["ExclusiveStartKey"] = last_key

        logger.info("survey 테이블 스캔 완료: %d건", len(all_items))

    except Exception:
        logger.exception("survey 테이블 스캔 실패")
        return response(500, {"error": "Internal server error"})

    rankings = aggregate_rankings(all_items)
    logger.info("랭킹 집계 완료: %d개 직업", len(rankings))

    return response(200, {"items": rankings})
