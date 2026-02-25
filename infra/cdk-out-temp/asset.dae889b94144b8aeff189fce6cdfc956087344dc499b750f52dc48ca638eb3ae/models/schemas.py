"""Pydantic v2 data models for Career Doomsday Clock.

Requirements: 2.2, 3.5, 3.6, 8.5
"""

from typing import Dict, List

from pydantic import BaseModel, Field, field_validator


class SurveyRequest(BaseModel):
    """설문 요청 모델. 모든 필수 항목은 공백만으로 구성될 수 없다."""

    session_id: str
    name: str = Field(min_length=1)
    job_title: str = Field(min_length=1)
    strengths: str = Field(min_length=1)
    hobbies: str = Field(min_length=1)

    @field_validator("name", "job_title", "strengths", "hobbies", mode="before")
    @classmethod
    def reject_whitespace_only(cls, v: str) -> str:
        if isinstance(v, str) and not v.strip():
            raise ValueError("Field must not be empty or whitespace-only")
        return v


class SkillRisk(BaseModel):
    """스킬별 AI 대체 위험도."""

    skill_name: str
    category: str
    replacement_prob: int = Field(ge=0, le=100)
    time_horizon: float = Field(gt=0)
    justification: str


class RoadmapStep(BaseModel):
    """커리어 전환 로드맵 단계."""

    step: str
    duration: str


class CareerCard(BaseModel):
    """커리어 카드 (3개 중 하나)."""

    card_index: int = Field(ge=0, le=2)
    combo_formula: str
    reason: str
    roadmap: List[RoadmapStep]


class AnalysisResult(BaseModel):
    """분석 결과 전체."""

    session_id: str
    dday: float
    skill_risks: List[SkillRisk]
    career_cards: List[CareerCard]


class GuestbookEntry(BaseModel):
    """방명록 항목 (DB에서 조회된 전체 데이터)."""

    entry_id: str
    created_at: str
    session_id: str
    job_title: str
    dday: float
    message: str
    reactions: Dict[str, int] = Field(default_factory=dict)


class GuestbookRequest(BaseModel):
    """방명록 등록 요청."""

    session_id: str
    job_title: str
    dday: float
    message: str = Field(min_length=1)

    @field_validator("message", mode="before")
    @classmethod
    def reject_whitespace_only_message(cls, v: str) -> str:
        if isinstance(v, str) and not v.strip():
            raise ValueError("Message must not be empty or whitespace-only")
        return v


class ReactionRequest(BaseModel):
    """이모지 반응 요청."""

    emoji: str = Field(min_length=1, max_length=2)
