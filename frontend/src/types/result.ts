/**
 * 결과 화면에서 사용하는 데이터 타입 정의
 * 디자인 문서의 API 인터페이스 기반
 */

export interface SkillRisk {
  skill_name: string;
  replacement_prob: number;
  time_horizon: number;
  justification: string;
}

export interface RoadmapStep {
  step: string;
  duration: string;
}

export interface CareerCard {
  card_index: number;
  combo_formula: string;
  reason: string;
  roadmap: RoadmapStep[];
}

export interface ResultData {
  session_id: string;
  status: "analyzing" | "completed" | "error";
  dday?: number;
  skill_risks?: SkillRisk[];
  career_cards?: CareerCard[];
}
