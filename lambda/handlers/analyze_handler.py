"""analyze_handler Lambda.

Bedrock Agent를 호출하여 스킬별 위험도와 커리어 카드를 생성하고
DynamoDB에 저장한다.

Requirements: 3.2, 3.3, 3.4
"""

import json
import os
import uuid
from decimal import Decimal
from typing import Any, Dict, List

import boto3

from botocore.config import Config

from utils.logging import get_logger

logger = get_logger(__name__)

dynamodb = boto3.resource("dynamodb")
bedrock_agent_runtime = boto3.client(
    "bedrock-agent-runtime",
    config=Config(read_timeout=120, connect_timeout=10, retries={"max_attempts": 2}),
)

SURVEY_TABLE_NAME = os.environ.get("SURVEY_TABLE_NAME", "")
SKILL_GRAPH_TABLE_NAME = os.environ.get("SKILL_GRAPH_TABLE_NAME", "")
CAREER_CARDS_TABLE_NAME = os.environ.get("CAREER_CARDS_TABLE_NAME", "")
BEDROCK_AGENT_ID = os.environ.get("BEDROCK_AGENT_ID", "")
BEDROCK_AGENT_ALIAS_ID = os.environ.get("BEDROCK_AGENT_ALIAS_ID", "")


def _build_prompt(name: str, job_title: str, age_group: str, strengths: str, hobbies: str, desired_work_years: str) -> str:
    """Bedrock Agent에 전달할 분석 프롬프트를 생성한다."""
    # strengths와 hobbies는 동일한 '보유 스킬' 값이 전달됨
    skills = strengths
    return (
        f"다음 사용자의 직업 수명과 커리어 전환을 분석해주세요.\n\n"
        f"이름: {name}\n"
        f"현재 직업: {job_title}\n"
        f"연령대: {age_group}\n"
        f"보유 스킬: {skills}\n"
        f"희망 근무 기간: {desired_work_years}\n\n"
        f"## 중요 지침\n"
        f"1. 사용자 입력의 진지도를 판단하세요. 직업이나 스킬이 비현실적이거나 장난스러운 경우(예: '우주해적', '숨쉬기'), "
        f"해당 입력을 가장 가까운 현실 직업/스킬로 해석하여 분석하세요.\n"
        f"2. career_cards의 추천 직업은 창의적이고 미래지향적이어야 합니다. "
        f"AI 시대에 새롭게 떠오르는 직업이나 기존 직업의 진화된 형태를 추천하세요. "
        f"예: 'AI 윤리 컨설턴트', '프롬프트 엔지니어', '디지털 트윈 설계사', 'AI-인간 협업 코디네이터' 등. "
        f"단, 완전히 허구적인 직업(예: '우주 마법사')은 제외하고, 실현 가능성이 있는 미래 직업을 추천하세요.\n"
        f"3. dday_reason은 D-Day 예측의 핵심 근거를 1~2문장으로 간결하게 작성하세요. "
        f"예: 'AI 코딩 도구의 급속한 발전으로 단순 개발 업무의 80%가 5년 내 자동화 예상'\n"
        f"4. 로드맵의 각 단계 duration은 현실적으로 설정하세요. "
        f"한 단계는 최소 1개월, 최대 12개월로 제한하고, 전체 로드맵은 6개월~3년 이내로 구성하세요.\n\n"
        f"다음 JSON 형식으로 응답해주세요:\n"
        f'{{\n'
        f'  "dday": <직업 수명 예측 년수 (숫자, 최소 1)>,\n'
        f'  "dday_reason": "<D-Day 예측의 핵심 근거 1~2문장>",\n'
        f'  "skill_risks": [\n'
        f'    {{\n'
        f'      "skill_name": "<스킬명>",\n'
        f'      "category": "<카테고리>",\n'
        f'      "replacement_prob": <AI 대체 확률 0-100>,\n'
        f'      "time_horizon": <대체 시간 범위 년수>,\n'
        f'      "justification": "<디스토피아 세계관 어조의 근거>"\n'
        f'    }}\n'
        f'  ],\n'
        f'  "career_cards": [\n'
        f'    {{\n'
        f'      "card_index": <0, 1, 또는 2>,\n'
        f'      "combo_formula": "[{job_title}] + [보유 스킬] = [새 직업명]",\n'
        f'      "reason": "<추천 사유>",\n'
        f'      "roadmap": [\n'
        f'        {{ "step": "<단계 설명>", "duration": "<기간, 예: 3개월>" }}\n'
        f'      ]\n'
        f'    }}\n'
        f'  ]\n'
        f'}}\n\n'
        f"skill_risks는 3~5개, career_cards는 정확히 3개를 생성해주세요.\n"
        f"Knowledge Base의 Future of Jobs Report 2025 데이터를 참고하여 "
        f"근거를 제시하고, 웹 검색으로 최신 트렌드를 반영해주세요.\n"
        f"반드시 JSON만 응답하세요. 다른 텍스트는 포함하지 마세요."
    )


def _parse_agent_response(raw_response: str) -> Dict[str, Any]:
    """Agent 응답에서 JSON을 추출하고 파싱한다."""
    text = raw_response.strip()

    # JSON 블록이 마크다운 코드 블록으로 감싸져 있을 수 있음
    if "```json" in text:
        start = text.index("```json") + len("```json")
        end = text.index("```", start)
        text = text[start:end].strip()
    elif "```" in text:
        start = text.index("```") + len("```")
        end = text.index("```", start)
        text = text[start:end].strip()

    return json.loads(text)


def _convert_to_decimal(obj: Any) -> Any:
    """DynamoDB 저장을 위해 float를 Decimal로 변환한다."""
    if isinstance(obj, float):
        return Decimal(str(obj))
    if isinstance(obj, int):
        return Decimal(str(obj))
    if isinstance(obj, dict):
        return {k: _convert_to_decimal(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_convert_to_decimal(i) for i in obj]
    return obj


def _invoke_bedrock_agent(prompt: str) -> str:
    """Bedrock Agent를 호출하고 응답 텍스트를 반환한다."""
    response = bedrock_agent_runtime.invoke_agent(
        agentId=BEDROCK_AGENT_ID,
        agentAliasId=BEDROCK_AGENT_ALIAS_ID,
        sessionId=str(uuid.uuid4()),
        inputText=prompt,
    )

    # 스트리밍 응답 수집
    completion = ""
    for event in response.get("completion", []):
        chunk = event.get("chunk", {})
        if "bytes" in chunk:
            completion += chunk["bytes"].decode("utf-8")

    return completion


def _save_skill_risks(
    session_id: str, skill_risks: List[Dict[str, Any]]
) -> None:
    """스킬 위험도 데이터를 skill_graph 테이블에 저장한다."""
    table = dynamodb.Table(SKILL_GRAPH_TABLE_NAME)
    with table.batch_writer() as batch:
        for risk in skill_risks:
            item = _convert_to_decimal({
                "session_id": session_id,
                "skill_name": risk["skill_name"],
                "category": risk.get("category", ""),
                "replacement_prob": risk["replacement_prob"],
                "time_horizon": risk["time_horizon"],
                "justification": risk["justification"],
            })
            batch.put_item(Item=item)
    logger.info("스킬 위험도 %d개 저장 완료: session_id=%s", len(skill_risks), session_id)


def _save_career_cards(
    session_id: str, career_cards: List[Dict[str, Any]]
) -> None:
    """커리어 카드 데이터를 career_cards 테이블에 저장한다."""
    table = dynamodb.Table(CAREER_CARDS_TABLE_NAME)
    with table.batch_writer() as batch:
        for card in career_cards:
            item = _convert_to_decimal({
                "session_id": session_id,
                "card_index": card["card_index"],
                "combo_formula": card["combo_formula"],
                "reason": card["reason"],
                "roadmap": card["roadmap"],
            })
            batch.put_item(Item=item)
    logger.info("커리어 카드 %d개 저장 완료: session_id=%s", len(career_cards), session_id)


def _update_survey_status(session_id: str, status: str) -> None:
    """survey 테이블의 status를 업데이트한다."""
    table = dynamodb.Table(SURVEY_TABLE_NAME)
    table.update_item(
        Key={"session_id": session_id},
        UpdateExpression="SET #s = :s",
        ExpressionAttributeNames={"#s": "status"},
        ExpressionAttributeValues={":s": status},
    )
    logger.info("survey status 업데이트: session_id=%s, status=%s", session_id, status)


def handler(event: dict, context) -> None:
    """analyze_handler 메인 진입점.

    survey_handler에서 비동기(Event)로 호출된다.
    Bedrock Agent를 통해 분석을 수행하고 결과를 DynamoDB에 저장한다.

    Args:
        event: survey_handler가 전달한 설문 데이터
            {session_id, name, job_title, strengths, hobbies}
        context: Lambda 컨텍스트 (사용하지 않음)
    """
    session_id = event.get("session_id", "")
    name = event.get("name", "")
    job_title = event.get("job_title", "")
    age_group = event.get("age_group", "")
    strengths = event.get("strengths", "")
    hobbies = event.get("hobbies", "")
    desired_work_years = event.get("desired_work_years", "")

    logger.info("분석 시작: session_id=%s, job_title=%s", session_id, job_title)

    try:
        # Bedrock Agent 호출
        prompt = _build_prompt(name, job_title, age_group, strengths, hobbies, desired_work_years)
        raw_response = _invoke_bedrock_agent(prompt)
        logger.info("Bedrock Agent 응답 수신: session_id=%s", session_id)

        # 응답 파싱
        result = _parse_agent_response(raw_response)

        # 스킬 위험도 저장
        skill_risks = result.get("skill_risks", [])
        _save_skill_risks(session_id, skill_risks)

        # 커리어 카드 저장
        career_cards = result.get("career_cards", [])
        _save_career_cards(session_id, career_cards)

        # D-Day 값과 근거를 survey 테이블에 저장하고 status를 completed로 업데이트
        table = dynamodb.Table(SURVEY_TABLE_NAME)
        table.update_item(
            Key={"session_id": session_id},
            UpdateExpression="SET #s = :s, dday = :d, dday_reason = :r",
            ExpressionAttributeNames={"#s": "status"},
            ExpressionAttributeValues={
                ":s": "completed",
                ":d": _convert_to_decimal(result.get("dday", 0)),
                ":r": result.get("dday_reason", ""),
            },
        )
        logger.info("분석 완료: session_id=%s", session_id)

    except json.JSONDecodeError:
        logger.exception("Bedrock Agent 응답 파싱 실패: session_id=%s", session_id)
        _update_survey_status(session_id, "error")

    except Exception:
        logger.exception("분석 중 예기치 않은 오류: session_id=%s", session_id)
        _update_survey_status(session_id, "error")
