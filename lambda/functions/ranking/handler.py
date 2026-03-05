"""GET /ranking Lambda 핸들러.

guestbook 테이블에서 직업별 D-Day 통계를 집계하여 랭킹을 반환한다.
- most_endangered: 수명이 가장 적게 남은 직업 Top 5
- most_survived: 수명이 가장 많이 남은 직업 Top 5

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

GUESTBOOK_TABLE_NAME = os.environ.get("GUESTBOOK_TABLE_NAME", "")

# 최소 제출 수 (이 미만인 직업은 제외)
MIN_SUBMISSIONS = 1

# 각 랭킹 최대 표시 수
TOP_N = 5


def aggregate_rankings(items: list[dict]) -> dict:
    """guestbook 항목 리스트에서 직업별 remaining_years 평균을 집계한다.

    - job_title별 평균 remaining_years 계산
    - count < MIN_SUBMISSIONS인 직업 제외
    - most_endangered: avg_remaining_years 오름차순 Top 5 (수명 적게 남은 직업)
    - most_survived: avg_remaining_years 내림차순 Top 5 (수명 많이 남은 직업)
    """
    # job_title별 remaining_years 값 수집
    job_data: dict[str, list[float]] = defaultdict(list)

    for item in items:
        job_title = item.get("job_title", "").strip()
        if not job_title:
            continue

        ry_raw = item.get("remaining_years")
        if ry_raw is None:
            continue

        try:
            ry_val = float(ry_raw) if isinstance(ry_raw, (Decimal, str)) else float(ry_raw)
        except (ValueError, TypeError):
            continue

        job_data[job_title].append(ry_val)

    # 집계: count >= MIN_SUBMISSIONS인 직업만 포함
    all_rankings = []
    for job_title, years_list in job_data.items():
        count = len(years_list)
        if count < MIN_SUBMISSIONS:
            continue
        avg_remaining_years = round(sum(years_list) / count, 1)
        all_rankings.append({
            "job_title": job_title,
            "avg_remaining_years": avg_remaining_years,
            "count": count,
        })

    # 수명 적게 남은 순 (오름차순)
    endangered = sorted(all_rankings, key=lambda x: x["avg_remaining_years"])[:TOP_N]

    # 수명 많이 남은 순 (내림차순)
    survived = sorted(all_rankings, key=lambda x: x["avg_remaining_years"], reverse=True)[:TOP_N]

    return {
        "most_endangered": endangered,
        "most_survived": survived,
    }


def handler(event: dict, context) -> dict:
    """GET /ranking 요청을 처리한다.

    guestbook 테이블을 스캔하여 직업별 D-Day 통계를 집계한다.
    """
    logger.info("GET /ranking 요청 수신")

    table = dynamodb.Table(GUESTBOOK_TABLE_NAME)

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

        logger.info("guestbook 테이블 스캔 완료: %d건", len(all_items))

    except Exception:
        logger.exception("guestbook 테이블 스캔 실패")
        return response(500, {"error": "Internal server error"})

    rankings = aggregate_rankings(all_items)
    logger.info(
        "랭킹 집계 완료: endangered=%d개, survived=%d개",
        len(rankings["most_endangered"]),
        len(rankings["most_survived"]),
    )

    return response(200, rankings)
